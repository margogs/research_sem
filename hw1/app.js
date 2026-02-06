import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6/dist/transformers.min.js";

// Global variables
let reviews = [];
let apiToken = "";
let sentimentPipeline = null;

// DOM elements
const analyzeBtn = document.getElementById("analyze-btn");
const reviewText = document.getElementById("review-text");
const sentimentResult = document.getElementById("sentiment-result");
const loadingElement = document.querySelector(".loading");
const errorElement = document.getElementById("error-message");
const apiTokenInput = document.getElementById("api-token");

// Google Apps Script Web App URL 
const GOOGLE_SCRIPT_URL = 'https://script.google.com/u/0/home/projects/19ouDbbYH1fa88a91Bs1bymKS6-MisX0JATUxS9MJyjsOSt96Jzu63Dlb/edit';

// Initialize the app
document.addEventListener("DOMContentLoaded", function () {
  // Load the TSV file
  loadReviews();

  // Set up event listeners
  analyzeBtn.addEventListener("click", analyzeRandomReview);
  apiTokenInput.addEventListener("change", saveApiToken);

  // Load saved API token if exists
  const savedToken = localStorage.getItem("hfApiToken");
  if (savedToken) {
    apiTokenInput.value = savedToken;
    apiToken = savedToken;
  }

  // Initialize transformers.js sentiment model
  initSentimentModel();
});

// Initialize transformers.js text-classification pipeline
async function initSentimentModel() {
  try {
    console.log("Loading sentiment model...");
    
    sentimentPipeline = await pipeline(
      "text-classification",
      "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
    );

    console.log("Sentiment model ready");
  } catch (error) {
    console.error("Failed to load sentiment model:", error);
    showError(
      "Failed to load sentiment model. Please check your network connection and try again."
    );
  }
}

// Load and parse the TSV file using Papa Parse
function loadReviews() {
  fetch("reviews_test.tsv")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load TSV file");
      }
      return response.text();
    })
    .then((tsvData) => {
      Papa.parse(tsvData, {
        header: true,
        delimiter: "\t",
        complete: (results) => {
          reviews = results.data
            .map((row) => row.text)
            .filter((text) => typeof text === "string" && text.trim() !== "");
          console.log("Loaded", reviews.length, "reviews");
        },
        error: (error) => {
          console.error("TSV parse error:", error);
          showError("Failed to parse TSV file: " + error.message);
        },
      });
    })
    .catch((error) => {
      console.error("TSV load error:", error);
      showError("Failed to load TSV file: " + error.message);
    });
}

// Save API token to localStorage
function saveApiToken() {
  apiToken = apiTokenInput.value.trim();
  if (apiToken) {
    localStorage.setItem("hfApiToken", apiToken);
  } else {
    localStorage.removeItem("hfApiToken");
  }
}

// Analyze a random review
async function analyzeRandomReview() {
  hideError();

  if (!Array.isArray(reviews) || reviews.length === 0) {
    showError("No reviews available. Please try again later.");
    return;
  }

  if (!sentimentPipeline) {
    showError("Sentiment model is not ready yet. Please wait a moment.");
    return;
  }

  const selectedReview = reviews[Math.floor(Math.random() * reviews.length)];

  // Display the review
  reviewText.textContent = selectedReview;

  // Show loading state
  loadingElement.style.display = "block";
  analyzeBtn.disabled = true;
  sentimentResult.innerHTML = "";
  sentimentResult.className = "sentiment-result";

  try {
    // Call local sentiment model
    const result = await analyzeSentiment(selectedReview);
    
    // Extract sentiment data
    const sentimentData = extractSentimentData(result);
    const { sentiment, label, score } = sentimentData;
    
    // Display result in UI
    displaySentiment(sentiment, label, score);
    
    // Log data to Google Sheets
    await logToGoogleSheet(selectedReview, sentimentData);
    
  } catch (error) {
    console.error("Error during analysis:", error);
    showError(error.message || "Failed to analyze sentiment.");
  } finally {
    loadingElement.style.display = "none";
    analyzeBtn.disabled = false;
  }
}

// Call local transformers.js pipeline for sentiment classification
async function analyzeSentiment(text) {
  if (!sentimentPipeline) {
    throw new Error("Sentiment model is not initialized.");
  }

  const output = await sentimentPipeline(text);

  if (!Array.isArray(output) || output.length === 0) {
    throw new Error("Invalid sentiment output from local model.");
  }

  return output;
}

// Extract sentiment data from model output
function extractSentimentData(output) {
  if (!Array.isArray(output) || output.length === 0) {
    return {
      sentiment: "neutral",
      label: "NEUTRAL",
      score: 0.5
    };
  }

  const sentimentData = output[0];
  let label = typeof sentimentData.label === "string" 
    ? sentimentData.label.toUpperCase() 
    : "NEUTRAL";
  let score = typeof sentimentData.score === "number" 
    ? sentimentData.score 
    : 0.5;

  // Determine sentiment bucket
  let sentiment;
  if (label === "POSITIVE" && score > 0.5) {
    sentiment = "positive";
  } else if (label === "NEGATIVE" && score > 0.5) {
    sentiment = "negative";
  } else {
    sentiment = "neutral";
    label = "NEUTRAL";
    score = 0.5;
  }

  return { sentiment, label, score };
}

// Display sentiment result in UI
function displaySentiment(sentiment, label, score) {
  sentimentResult.classList.add(sentiment);
  sentimentResult.innerHTML = `
    <i class="fas ${getSentimentIcon(sentiment)} icon"></i>
    <span>${label} (${(score * 100).toFixed(1)}% confidence)</span>
  `;
}

// Get appropriate icon for sentiment
function getSentimentIcon(sentiment) {
  switch (sentiment) {
    case "positive":
      return "fa-thumbs-up";
    case "negative":
      return "fa-thumbs-down";
    default:
      return "fa-question-circle";
  }
}

// Log data to Google Sheets
async function logToGoogleSheet(review, sentimentData) {
  const { label, score } = sentimentData;
  
  // Prepare data for logging
  const data = {
    ts: Date.now(), // Current timestamp in milliseconds
    review: review,
    sentiment: `${label} (${(score * 100).toFixed(1)}% confidence)`,
    meta: JSON.stringify({
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
      model: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      apiTokenStored: !!apiToken
    })
  };

  try {
    // Send data to Google Apps Script
    const formData = new URLSearchParams();
    for (const [key, value] of Object.entries(data)) {
      formData.append(key, value);
    }

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // No-CORS для Google Apps Script
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    console.log('Data logged to Google Sheets:', data);
  } catch (error) {
    console.error('Failed to log data to Google Sheets:', error);
    // Don't show error to user - logging failure shouldn't break the app
  }
}

// Show error message
function showError(message) {
  errorElement.textContent = message;
  errorElement.style.display = "block";
}

// Hide error message
function hideError() {
  errorElement.style.display = "none";
}
