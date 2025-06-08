// Application Configuration
const CONFIG = {
    apiKey: 'AIzaSyDAF9YRd_c4ze5mtZttSyn5uijQYDnXPlg',
    modelName: 'gemini-1.5-flash',
    maxCharacters: 500000,
    maxTitleLength: 80,
    imageSettings: {
        maxWidth: 600,
        maxHeight: 600,
        qualityLevels: {
            high: 0.9,
            medium: 0.7,
            low: 0.5
        }
    },
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    characterThresholds: {
        safe: 400000,
        warning: 450000,
        critical: 500000
    },
    allowedTags: ['p', 'b', 'strong', 'ul', 'li', 'img', 'h2', 'h3', 'br', 'table', 'tr', 'td']
};

// Global State
let uploadedImages = [];
let optimizedImages = [];
let generatedContent = {
    title: '',
    description: '',
    features: '',
    specifications: ''
};

// DOM Elements
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const uploadedImagesContainer = document.getElementById('uploadedImages');
const qualitySelect = document.getElementById('qualitySelect');
const characterCount = document.getElementById('characterCount');
const characterProgress = document.getElementById('characterProgress');
const characterStatus = document.getElementById('characterStatus');
const analyzeBtn = document.getElementById('analyzeBtn');
const analyzeLoader = document.getElementById('analyzeLoader');
const analysisError = document.getElementById('analysisError');
const contentSection = document.getElementById('contentSection');
const previewSection = document.getElementById('previewSection');
const exportSection = document.getElementById('exportSection');
const titleInput = document.getElementById('titleInput');
const titleCount = document.getElementById('titleCount');
const descriptionInput = document.getElementById('descriptionInput');
const featuresInput = document.getElementById('featuresInput');
const specificationsInput = document.getElementById('specificationsInput');
const previewTitle = document.getElementById('previewTitle');
const previewContent = document.getElementById('previewContent');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const exportFeedback = document.getElementById('exportFeedback');

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    updateCharacterCounter();
});

// Event Listeners
function initializeEventListeners() {
    // Upload Zone Events
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('dragleave', handleDragLeave);
    uploadZone.addEventListener('drop', handleDrop);
    
    // File Input
    fileInput.addEventListener('change', handleFileSelect);
    
    // Quality Selection
    qualitySelect.addEventListener('change', handleQualityChange);
    
    // Analysis Button
    analyzeBtn.addEventListener('click', analyzeImages);
    
    // Content Inputs
    titleInput.addEventListener('input', handleTitleInput);
    descriptionInput.addEventListener('input', updatePreview);
    featuresInput.addEventListener('input', updatePreview);
    specificationsInput.addEventListener('input', updatePreview);
    
    // Export Buttons
    copyBtn.addEventListener('click', copyToClipboard);
    downloadBtn.addEventListener('click', downloadHTML);
}

// Drag and Drop Handlers
function handleDragOver(e) {
    e.preventDefault();
    uploadZone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    processFiles(files);
}

// File Processing
function processFiles(files) {
    const validFiles = files.filter(file => CONFIG.allowedImageTypes.includes(file.type));
    
    if (validFiles.length !== files.length) {
        showError('Some files were skipped. Only JPEG, PNG, WebP, and GIF files are allowed.');
    }
    
    validFiles.forEach(file => {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            showError(`File ${file.name} is too large. Maximum size is 10MB.`);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = {
                file: file,
                name: file.name,
                size: file.size,
                dataUrl: e.target.result,
                optimized: false
            };
            
            uploadedImages.push(imageData);
            displayUploadedImage(imageData);
            optimizeImage(imageData);
        };
        reader.readAsDataURL(file);
    });
}

function displayUploadedImage(imageData) {
    const imageItem = document.createElement('div');
    imageItem.className = 'image-item';
    imageItem.innerHTML = `
        <img src="${imageData.dataUrl}" alt="${imageData.name}" class="image-preview">
        <div class="image-info">
            ${imageData.name}<br>
            ${formatFileSize(imageData.size)}
        </div>
        <button class="image-remove" onclick="removeImage('${imageData.name}')">×</button>
    `;
    
    uploadedImagesContainer.appendChild(imageItem);
}

function removeImage(imageName) {
    uploadedImages = uploadedImages.filter(img => img.name !== imageName);
    optimizedImages = optimizedImages.filter(img => img.name !== imageName);
    
    // Remove from DOM
    const imageItems = uploadedImagesContainer.querySelectorAll('.image-item');
    imageItems.forEach(item => {
        if (item.querySelector('.image-info').textContent.includes(imageName)) {
            item.remove();
        }
    });
    
    updateCharacterCounter();
}

// Image Optimization
function optimizeImage(imageData) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
        // Calculate new dimensions
        const { width, height } = calculateDimensions(img.width, img.height);
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        const quality = CONFIG.imageSettings.qualityLevels[qualitySelect.value];
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        const optimizedImage = {
            ...imageData,
            optimizedDataUrl: optimizedDataUrl,
            optimizedSize: Math.round(optimizedDataUrl.length * 0.75), // Approximate base64 size
            optimized: true,
            dimensions: { width, height }
        };
        
        // Update or add to optimized images
        const existingIndex = optimizedImages.findIndex(img => img.name === imageData.name);
        if (existingIndex >= 0) {
            optimizedImages[existingIndex] = optimizedImage;
        } else {
            optimizedImages.push(optimizedImage);
        }
        
        updateCharacterCounter();
    };
    
    img.src = imageData.dataUrl;
}

function calculateDimensions(originalWidth, originalHeight) {
    const maxWidth = CONFIG.imageSettings.maxWidth;
    const maxHeight = CONFIG.imageSettings.maxHeight;
    
    let width = originalWidth;
    let height = originalHeight;
    
    if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        
        if (width > height) {
            width = maxWidth;
            height = width / aspectRatio;
        } else {
            height = maxHeight;
            width = height * aspectRatio;
        }
    }
    
    return { width: Math.round(width), height: Math.round(height) };
}

function handleQualityChange() {
    optimizedImages.forEach(imageData => {
        const originalImage = uploadedImages.find(img => img.name === imageData.name);
        if (originalImage) {
            optimizeImage(originalImage);
        }
    });
}

// Character Counter
function updateCharacterCounter() {
    const totalSize = optimizedImages.reduce((sum, img) => sum + (img.optimizedSize || 0), 0);
    const contentLength = getTotalContentLength();
    const totalCharacters = totalSize + contentLength;
    
    characterCount.textContent = totalCharacters.toLocaleString();
    
    const percentage = (totalCharacters / CONFIG.maxCharacters) * 100;
    characterProgress.style.width = `${Math.min(percentage, 100)}%`;
    
    // Update status and colors
    if (totalCharacters < CONFIG.characterThresholds.safe) {
        updateCounterStatus('safe', 'Safe');
    } else if (totalCharacters < CONFIG.characterThresholds.warning) {
        updateCounterStatus('warning', 'Warning');
    } else {
        updateCounterStatus('critical', 'Critical');
    }
}

function updateCounterStatus(level, text) {
    characterProgress.className = `counter-progress ${level}`;
    characterStatus.className = `counter-status ${level}`;
    characterStatus.textContent = text;
}

function getTotalContentLength() {
    return (generatedContent.title || '').length +
           (generatedContent.description || '').length +
           (generatedContent.features || '').length +
           (generatedContent.specifications || '').length;
}

// AI Analysis
async function analyzeImages() {
    if (optimizedImages.length === 0) {
        showError('Please upload at least one image before analyzing.');
        return;
    }
    
    setAnalyzing(true);
    hideError();
    
    try {
        const response = await callGeminiAPI();
        const content = parseAIResponse(response);
        
        generatedContent = content;
        populateContentInputs(content);
        showContentSection();
        updatePreview();
        
    } catch (error) {
        console.error('Analysis error:', error);
        showError(`Analysis failed: ${error.message}`);
    } finally {
        setAnalyzing(false);
    }
}

async function callGeminiAPI() {
    const images = optimizedImages.map(img => ({
        inlineData: {
            data: img.optimizedDataUrl.split(',')[1],
            mimeType: 'image/jpeg'
        }
    }));
    
    const prompt = `Analyze these product images and extract detailed information. Provide ONLY the following sections in JSON format:

{
  "title": "Generate a concise, descriptive product title (max 80 characters)",
  "description": "Write a compelling product description focusing on key benefits and uses",
  "features": "List key features as bullet points, one per line starting with •",
  "specifications": "Create a specifications table in HTML format with technical details, dimensions, materials, etc."
}

Focus ONLY on the product itself. Do not include any shipping information, store policies, or promotional content. Extract technical specifications, dimensions, materials, colors, and any visible product details from the images.`;
    
    const requestBody = {
        contents: [{
            parts: [
                { text: prompt },
                ...images
            ]
        }]
    };
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.modelName}:generateContent?key=${CONFIG.apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorData}`);
    }
    
    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response from AI service');
    }
    
    return data.candidates[0].content.parts[0].text;
}

function parseAIResponse(response) {
    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in response');
        const jsonContent = JSON.parse(jsonMatch[0]);

        const unescapeHTML = str => {
            const txt = document.createElement("textarea");
            txt.innerHTML = str;
            return txt.value;
        };

        return {
            title: (jsonContent.title || '').substring(0, CONFIG.maxTitleLength),
            description: jsonContent.description || '',
            features: jsonContent.features || '',
            specifications: unescapeHTML(jsonContent.specifications || '')
        };
    } catch (error) {
        console.error('Failed to parse AI response:', error);
        return {
            title: 'Product Title',
            description: 'Product description will be generated here.',
            features: '• Feature 1\n• Feature 2\n• Feature 3',
            specifications: '<table><tr><td>Specification</td><td>Value</td></tr></table>'
        };
    }
}
        
        const jsonContent = JSON.parse(jsonMatch[0]);
        
        return {
            title: (jsonContent.title || '').substring(0, CONFIG.maxTitleLength),
            description: jsonContent.description || '',
            features: jsonContent.features || '',
            specifications: jsonContent.specifications || ''
        };
    } catch (error) {
        console.error('Failed to parse AI response:', error);
        return {
            title: 'Product Title',
            description: 'Product description will be generated here.',
            features: '• Feature 1\n• Feature 2\n• Feature 3',
            specifications: '<table><tr><td>Specification</td><td>Value</td></tr></table>'
        };
    }
}

function populateContentInputs(content) {
    titleInput.value = content.title;
    descriptionInput.value = content.description;
    featuresInput.value = content.features;
    specificationsInput.value = content.specifications;
    
    updateTitleCounter();
    updateCharacterCounter();
}

function showContentSection() {
    contentSection.classList.remove('hidden');
    previewSection.classList.remove('hidden');
    exportSection.classList.remove('hidden');
}

function setAnalyzing(analyzing) {
    analyzeBtn.disabled = analyzing;
    if (analyzing) {
        analyzeBtn.querySelector('.btn-text').classList.add('hidden');
        analyzeLoader.classList.remove('hidden');
    } else {
        analyzeBtn.querySelector('.btn-text').classList.remove('hidden');
        analyzeLoader.classList.add('hidden');
    }
}

// Content Input Handlers
function handleTitleInput() {
    generatedContent.title = titleInput.value;
    updateTitleCounter();
    updateCharacterCounter();
    updatePreview();
}

function updateTitleCounter() {
    const length = titleInput.value.length;
    titleCount.textContent = length;
    titleCount.style.color = length > CONFIG.maxTitleLength ? 'var(--color-error)' : 'var(--color-text-secondary)';
}

// Preview Generation
function updatePreview() {
    generatedContent = {
        title: titleInput.value,
        description: descriptionInput.value,
        features: featuresInput.value,
        specifications: specificationsInput.value
    };
    
    previewTitle.textContent = generatedContent.title;
    previewContent.innerHTML = generateHTML();
    updateCharacterCounter();
}

function generateHTML() {
    let html = '';
    
    // Add product images
    optimizedImages.forEach(img => {
        html += `<img src="${img.optimizedDataUrl}" alt="Product Image" style="max-width: 100%; height: auto; border: 1px solid #ddd; margin: 10px 0;"><br>`;
    });
    
    // Add description
    if (generatedContent.description) {
        html += `<h2>Product Description</h2>`;
        html += `<p>${sanitizeHTML(generatedContent.description)}</p>`;
    }
    
    // Add features
    if (generatedContent.features) {
        html += `<h3>Key Features</h3>`;
        html += `<ul>`;
        generatedContent.features.split('\n').forEach(feature => {
            const cleanFeature = feature.replace(/^[•\-\*]\s*/, '').trim();
            if (cleanFeature) {
                html += `<li>${sanitizeHTML(cleanFeature)}</li>`;
            }
        });
        html += `</ul>`;
    }
    
    // Add specifications
    if (generatedContent.specifications) {
        html += `<h3>Specifications</h3>`;
        if (generatedContent.specifications.includes('<table>')) {
            html += sanitizeHTML(generatedContent.specifications);
        } else {
            // Convert plain text to table
            html += '<table>';
            generatedContent.specifications.split('\n').forEach(spec => {
                if (spec.trim()) {
                    const parts = spec.split(':');
                    if (parts.length >= 2) {
                        html += `<tr><td><strong>${sanitizeHTML(parts[0].trim())}</strong></td><td>${sanitizeHTML(parts.slice(1).join(':').trim())}</td></tr>`;
                    }
                }
            });
            html += '</table>';
        }
    }
    
    return html;
}

function sanitizeHTML(input) {
    const allowedTags = CONFIG.allowedTags;
    const parser = new DOMParser();
    const doc = parser.parseFromString(input, 'text/html');
    const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, {
        acceptNode(node) {
            return allowedTags.includes(node.tagName.toLowerCase()) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
    });

    let node;
    while ((node = walker.nextNode())) {
        [...node.childNodes].forEach(child => {
            if (child.nodeType === Node.ELEMENT_NODE && !allowedTags.includes(child.tagName.toLowerCase())) {
                child.remove();
            }
        });
    }

    return doc.body.innerHTML;
}

// Export Functions
async function copyToClipboard() {
    try {
        const htmlContent = generateCompleteHTML();
        await navigator.clipboard.writeText(htmlContent);
        showExportFeedback('Content copied to clipboard!', 'success');
    } catch (error) {
        showExportFeedback('Failed to copy to clipboard', 'error');
    }
}

function downloadHTML() {
    const htmlContent = generateCompleteHTML();
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ebay-listing.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showExportFeedback('HTML file downloaded!', 'success');
}

function generateCompleteHTML() {
    const html = generateHTML();
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${generatedContent.title}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        img { max-width: 100%; height: auto; border: 1px solid #ddd; margin: 10px 0; border-radius: 4px; }
        h2, h3 { color: #2c3e50; margin-top: 25px; }
        ul { padding-left: 20px; }
        li { margin-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        td { padding: 10px; border: 1px solid #ddd; vertical-align: top; }
        td:first-child { font-weight: bold; background-color: #f8f9fa; }
        @media (max-width: 600px) { body { padding: 10px; } }
    </style>
</head>
<body>
    <h1>${generatedContent.title}</h1>
    ${html}
</body>
</html>`;
}

// Utility Functions
function showError(message) {
    analysisError.textContent = message;
    analysisError.classList.remove('hidden');
}

function hideError() {
    analysisError.classList.add('hidden');
}

function showExportFeedback(message, type) {
    exportFeedback.textContent = message;
    exportFeedback.className = `export-feedback ${type}`;
    exportFeedback.classList.remove('hidden');
    
    setTimeout(() => {
        exportFeedback.classList.add('hidden');
    }, 3000);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}