// Global variables
let isRecording = false;
let selectedLanguage = 'en';
let lastFocusedField = null;

// Voice Recognition Setup
let recognition;
let currentField = null;

console.log("main.js loaded");

// Language selection handler
function handleLanguageChange(language) {
    selectedLanguage = language;
    updateLanguageUI(language);
}

function updateLanguageUI(language) {
    // Update all elements with data attributes
    document.querySelectorAll('[data-en], [data-hi], [data-te]').forEach(element => {
        const text = element.getAttribute(`data-${language}`);
        if (text) {
            element.textContent = text;
        }
    });

    // Update notes based on language
    const notes = document.querySelectorAll('.note');
    notes.forEach(note => {
        const noteText = note.getAttribute(`data-${language}`);
        if (noteText) {
            note.textContent = noteText;
        }
    });

    // Update example texts
    const exampleTexts = document.querySelectorAll('.example-text');
    exampleTexts.forEach(text => {
        const exampleText = text.getAttribute(`data-${language}`);
        if (exampleText) {
            text.textContent = exampleText;
        }
    });

    // Update modal messages
    const modalMessages = document.querySelectorAll('.modal-message');
    modalMessages.forEach(message => {
        const modalText = message.getAttribute(`data-${language}`);
        if (modalText) {
            message.textContent = modalText;
        }
    });
}

// Voice recording functions
async function startRecording() {
    if (!recognition) {
        console.error('Speech recognition not initialized');
        showError('Speech recognition not initialized. Please refresh the page.');
        return;
    }

    try {
        // Check if already recording
        if (isRecording) {
            console.log('Already recording');
            return;
        }

        // Store the current focused field
        lastFocusedField = document.activeElement;
        
        // Set language based on selection
        recognition.lang = getRecognitionLanguage();
        
        // Start recognition
        recognition.start();
        isRecording = true;
        updateRecordingUI(true);
        
        // Update status message
        if (lastFocusedField && lastFocusedField.tagName === 'INPUT') {
            updateVoiceStatus();
        }

        console.log('Recording started');
    } catch (error) {
        console.error('Error starting recording:', error);
        showError('Failed to start recording. Please try again.');
        isRecording = false;
        updateRecordingUI(false);
    }
}

function stopRecording() {
    if (recognition) {
        recognition.stop();
        isRecording = false;
        updateRecordingUI(false);
        console.log('Recording stopped');
    }
}

function updateRecordingUI(isRecording) {
    const voiceBtn = document.getElementById('floatingVoiceBtn');
    const voiceStatus = document.getElementById('floatingVoiceStatus');
    
    if (voiceBtn) {
        voiceBtn.classList.toggle('recording', isRecording);
        voiceBtn.querySelector('i').classList.toggle('fa-microphone', !isRecording);
        voiceBtn.querySelector('i').classList.toggle('fa-stop', isRecording);
    }
    
    if (voiceStatus) {
    if (isRecording) {
            const recordingMessage = {
                'en': 'Recording... Speak now!',
                'hi': 'रिकॉर्डिंग... अब बोलिए!',
                'te': 'రికార్డింగ్... ఇప్పుడు మాట్లాడండి!'
            };
            voiceStatus.textContent = recordingMessage[selectedLanguage] || recordingMessage['en'];
            voiceStatus.classList.add('recording');
            voiceStatus.classList.add('show');  // Show the status
    } else {
            voiceStatus.classList.remove('recording');
            voiceStatus.classList.remove('show');  // Hide the status
        }
    }
}

// Audio processing and API calls
async function processAudio(audioBlob) {
    try {
        const formData = new FormData();
        formData.append('audio', audioBlob);
        formData.append('language', selectedLanguage);
        formData.append('transaction_type', getCurrentTransactionType());

        const response = await fetch('/record', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.error) {
            showError(data.error);
            return;
        }

        displayTranscription(data);
        await handleTransaction(data);
    } catch (error) {
        showError('Error processing audio: ' + error.message);
    }
}

function getCurrentTransactionType() {
    const path = window.location.pathname;
    if (path.includes('deposit')) return 'deposit';
    if (path.includes('withdraw')) return 'withdraw';
    if (path.includes('account-opening')) return 'account';
    return 'deposit';
}

function displayTranscription(data) {
    const transcriptionDiv = document.getElementById('transcriptionResult');
    if (data.transcription) {
        transcriptionDiv.innerHTML = `
            <h3>Transcription (${selectedLanguage.toUpperCase()}):</h3>
            <p>${data.transcription}</p>
            <h3>Translation (English):</h3>
            <p>${data.translation}</p>
        `;
    }
}

async function handleTransaction(data) {
    const transactionType = getCurrentTransactionType();
    
    if (transactionType === 'account') {
        await handleAccountOpening(data);
    } else {
        await handleBankingTransaction(data, transactionType);
    }
}

async function handleAccountOpening(data) {
    try {
        const response = await fetch('/api/accounts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: data.name,
                email: data.email,
                phone: data.phone,
                address: data.address,
                account_type: data.account_type
            })
        });

        const result = await response.json();
        
        if (result.error) {
            showError(result.error);
            return;
        }

        showSuccess(`Account opened successfully! Your account number is: ${result.account_number}`);
        resetForm();
    } catch (error) {
        showError('Error opening account: ' + error.message);
    }
}

async function handleBankingTransaction(data, transactionType) {
    try {
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                account_number: data.account_number,
                amount: data.amount,
                transaction_type: transactionType,
                original_speech: data.transcription,
                translated_speech: data.translation,
                language: selectedLanguage
            })
        });

        const result = await response.json();
        
        if (result.error) {
            showError(result.error);
            return;
        }

        showSuccess(`Transaction successful! New balance: $${result.account_balance.toFixed(2)}`);
        resetForm();
    } catch (error) {
        showError('Error processing transaction: ' + error.message);
    }
}

// UI helper functions
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 5000);
}

function resetForm() {
    const form = document.querySelector('form');
    if (form) {
        form.reset();
    }
    document.getElementById('transcriptionResult').innerHTML = '';
}

// Check if backend is running
async function checkBackendStatus() {
    try {
        const response = await fetch('/api/health');
        return response.ok;
    } catch (error) {
        return false;
    }
}

// Initialize speech recognition
function initializeSpeechRecognition() {
    try {
        if ('webkitSpeechRecognition' in window) {
            recognition = new webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            // Set language based on selection
            recognition.lang = getRecognitionLanguage();

            recognition.onstart = () => {
                console.log('Speech recognition started');
                isRecording = true;
                updateRecordingUI(true);
            };  

            recognition.onend = () => {
                console.log('Speech recognition ended');
                isRecording = false;
                updateRecordingUI(false);
            };

            recognition.onresult = (event) => {
                console.log('Speech recognition result:', event.results);
                const transcript = event.results[0][0].transcript;
                handleVoiceInput(transcript);
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                handleRecognitionError(event.error);
                isRecording = false;
                updateRecordingUI(false);
            };

            // Request microphone permission
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(() => {
                    console.log('Microphone permission granted');
                    // Test the connection
                    testSpeechRecognitionConnection();
                })
                .catch((error) => {
                    console.error('Microphone permission denied:', error);
                    showError('Microphone access is required for voice input. Please allow microphone access in your browser settings.');
                });
        } else {
            showError('Speech recognition is not supported in this browser. Please use Chrome or Edge');
        }
    } catch (error) {
        console.error('Error initializing speech recognition:', error);
        showError('Failed to initialize speech recognition. Please refresh the page and try again');
    }
}

// Handle recognition errors
function handleRecognitionError(error) {
    let errorMessage = 'Failed to start recording. Please try again.';
    
    switch(error) {
        case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
            break;
        case 'no-speech':
            errorMessage = 'No speech detected. Please speak clearly.';
            break;
        case 'audio-capture':
            errorMessage = 'No microphone detected. Please check your microphone connection.';
            break;
        case 'network':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
        case 'service-not-allowed':
            errorMessage = 'Speech recognition service is not allowed. Please check your browser settings.';
            break;
        case 'bad-grammar':
            errorMessage = 'Speech recognition error. Please try again.';
            break;
        case 'language-not-supported':
            errorMessage = 'Selected language is not supported. Please try a different language.';
            break;
    }
    
    showError(errorMessage);
}

// Test speech recognition connection
function testSpeechRecognitionConnection() {
    try {
        // Create a temporary recognition instance for testing
        const testRecognition = new webkitSpeechRecognition();
        testRecognition.lang = 'en-US';
        
        testRecognition.onerror = (event) => {
            console.error('Test connection error:', event.error);
            const isBrave = navigator.brave !== undefined;
            if (event.error === 'network' || event.error === 'not-allowed') {
                showError(isBrave ? 
                    'Unable to connect to speech recognition service. Please check your Brave browser settings. Click the Brave shield icon (lion) in the address bar and allow microphone access.' :
                    'Unable to connect to speech recognition service. Please check your internet connection and try again');
            }
        };

        // Try to start and immediately stop
        testRecognition.start();
        setTimeout(() => {
            testRecognition.stop();
        }, 100);
    } catch (error) {
        console.error('Test connection failed:', error);
        showError('Failed to connect to speech recognition service. Please try again');
    }
}

// Get recognition language based on selection
function getRecognitionLanguage() {
    const languageMap = {
        'en': 'en-US',
        'hi': 'hi-IN',
        'te': 'te-IN'
    };
    return languageMap[selectedLanguage] || 'en-US';
}

// Update voice button UI
function updateVoiceButton(isRecording) {
    const voiceBtn = document.getElementById('floatingVoiceBtn');
    if (voiceBtn) {
        voiceBtn.classList.toggle('recording', isRecording);
        voiceBtn.querySelector('i').classList.toggle('fa-microphone', !isRecording);
        voiceBtn.querySelector('i').classList.toggle('fa-stop', isRecording);
    }
}

// Get status message based on language
function getStatusMessage(type) {
    const messages = {
        recording: {
            en: 'Recording... Click to stop',
            hi: 'रिकॉर्डिंग... रुकने के लिए क्लिक करें',
            te: 'రికార్డింగ్... ఆపడానికి క్లిక్ చేయండి'
        },
        ready: {
            en: 'Click microphone to start recording',
            hi: 'रिकॉर्डिंग शुरू करने के लिए माइक्रोफ़ोन पर क्लिक करें',
            te: 'రికార్డింగ్ ప్రారంభించడానికి మైక్రోఫోన్‌ను క్లిక్ చేయండి'
        }
    };
    return messages[type][selectedLanguage] || messages[type].en;
}

// Field mappings for voice input
const fieldMappings = {
    'full-name': {
        en: ['name', 'full name'],
        hi: ['नाम', 'पूरा नाम'],
        te: ['పేరు', 'పూర్తి పేరు']
    },
    'dob': {
        en: ['date of birth', 'birth date', 'dob'],
        hi: ['जन्म तिथि', 'जन्म की तारीख'],
        te: ['పుట్టిన తేది']
    },
    'gender': {
        en: ['gender', 'sex'],
        hi: ['लिंग', 'जेंडर'],
        te: ['లింగం']
    },
    'email': {
        en: ['email', 'email address'],
        hi: ['ईमेल', 'ईमेल पता'],
        te: ['ఇమెయిల్', 'ఇమెయిల్ చిరునామా']
    },
    'phone': {
        en: ['phone', 'phone number', 'mobile'],
        hi: ['फोन', 'मोबाइल', 'फोन नंबर'],
        te: ['ఫోన్', 'ఫోన్ నంబర్']
    },
    'address': {
        en: ['address', 'residence'],
        hi: ['पता', 'निवास'],
        te: ['చిరునామా', 'నివాసం']
    },
    'city': {
        en: ['city', 'town'],
        hi: ['शहर', 'नगर'],
        te: ['నగరం', 'పట్టణం']
    },
    'state': {
        en: ['state', 'province'],
        hi: ['राज्य', 'प्रांत'],
        te: ['రాష్ట్రం']
    },
    'country': {
        en: ['country', 'nation'],
        hi: ['देश', 'राष्ट्र'],
        te: ['దేశం']
    },
    'zipcode': {
        en: ['zip', 'zip code', 'postal code', 'pin code'],
        hi: ['पिन कोड', 'पिन', 'जिप कोड'],
        te: ['పిన్ కోడ్', 'పోస్టల్ కోడ్']
    },
    'occupation': {
        en: ['occupation', 'job', 'profession'],
        hi: ['व्यवसाय', 'नौकरी', 'पेशा'],
        te: ['వృత్తి', 'ఉద్యోగం']
    },
    'annual-income': {
        en: ['income', 'annual income', 'yearly income'],
        hi: ['आय', 'वार्षिक आय', 'सालाना आय'],
        te: ['ఆదాయం', 'వార్షిక ఆదాయం']
    },
    'account-type': {
        en: ['account type', 'account'],
        hi: ['खाता प्रकार', 'अकाउंट टाइप'],
        te: ['ఖాతా రకం']
    },
    'nationality': {
        en: ['nationality', 'citizenship'],
        hi: ['राष्ट्रीयता', 'नागरिकता'],
        te: ['జాతీయత']
    },
    'mothers-name': {
        en: ['mothers name', 'mother name', 'mothers maiden name'],
        hi: ['माँ का नाम', 'माता का नाम'],
        te: ['తల్లి పేరు']
    },
    'id-number': {
        en: ['id number', 'identification number', 'aadhar', 'ssn'],
        hi: ['पहचान संख्या', 'आधार नंबर'],
        te: ['గుర్తింపు సంఖ్య', 'ఆధార్ నంబర్']
    },
    'nominee-name': {
        en: ['nominee name', 'nominee'],
        hi: ['नामांकित व्यक्ति का नाम', 'नॉमिनी का नाम'],
        te: ['నామినీ పేరు']
    },
    'nominee-relationship': {
        en: ['nominee relationship', 'relationship with nominee'],
        hi: ['नामांकित व्यक्ति का रिश्ता', 'नॉमिनी का रिश्ता'],
        te: ['నామినీతో సంబంధం']
    }
};

// Show custom confirmation modal
function showConfirmationModal(message, onConfirm, onCancel) {
    const modalOverlay = document.getElementById('confirmationModal');
    const modalMessage = document.getElementById('modalMessage');
    const confirmBtn = document.getElementById('modalConfirm');
    const cancelBtn = document.getElementById('modalCancel');
    const timerDisplay = modalOverlay.querySelector('.modal-timer');

    modalMessage.textContent = message;
    modalOverlay.style.display = 'flex';

    // Remove any existing event listeners
    confirmBtn.replaceWith(confirmBtn.cloneNode(true));
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));

    // Get the new buttons
    const newConfirmBtn = document.getElementById('modalConfirm');
    const newCancelBtn = document.getElementById('modalCancel');

    // Add new event listeners
    newConfirmBtn.addEventListener('click', () => {
        modalOverlay.style.display = 'none';
        if (onConfirm) onConfirm();
    });

    newCancelBtn.addEventListener('click', () => {
        modalOverlay.style.display = 'none';
        if (onCancel) onCancel();
    });

    // Initialize countdown
    let timeLeft = 6;
    timerDisplay.textContent = timeLeft;

    // Update timer display every second
    const timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            modalOverlay.style.display = 'none';
            if (onConfirm) onConfirm();
        }
    }, 1000);

    // Clear timer if modal is closed manually
    newConfirmBtn.addEventListener('click', () => clearInterval(timerInterval));
    newCancelBtn.addEventListener('click', () => clearInterval(timerInterval));
}

// Function to handle voice input for all forms
function handleVoiceInput(transcript) {
    console.log('Handling voice input:', transcript);
    
    // Use the last focused field if current field is not available
    const fieldToUpdate = lastFocusedField || document.activeElement;
    
    if (!fieldToUpdate || !fieldToUpdate.tagName) {
        console.error('No active field found');
                            return;
                        }

    // Get the current page type
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    console.log('Current page:', currentPage);

    // Show confirmation modal
    showConfirmationModal(
        `Did you say "${transcript}"?`,
        // Confirm callback
        () => {
            // Handle based on page type
            switch(currentPage) {
                case 'account-opening.html':
                    handleAccountOpeningVoiceInput(fieldToUpdate, transcript);
                    break;
                case 'deposit.html':
                    handleDepositVoiceInput(fieldToUpdate, transcript);
                    break;
                case 'withdraw.html':
                    handleWithdrawVoiceInput(fieldToUpdate, transcript);
                    break;
                default:
                    console.error('Unknown page type:', currentPage);
            }

            // Trigger input and change events to ensure form validation
            fieldToUpdate.dispatchEvent(new Event('input'));
            fieldToUpdate.dispatchEvent(new Event('change'));

            // Restore focus to the field
            fieldToUpdate.focus();
        },
        // Cancel callback
        () => {
            // Ask if they want to try again using the custom modal
            showConfirmationModal(
                'Would you like to try speaking again?',
                () => startRecording(),
                null
            );
        }
    );
}

// Helper function to parse date from voice input
function parseDateFromVoice(transcript, language) {
    // Remove any extra spaces and convert to lowercase
    transcript = transcript.toLowerCase().trim();
    
    // Common date patterns in different languages
    const datePatterns = {
        en: [
            /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/,  // MM/DD/YYYY
            /\b(\d{1,2})-(\d{1,2})-(\d{4})\b/,     // MM-DD-YYYY
            /\b(\d{1,2})th\s+of\s+(\w+)\s+(\d{4})\b/, // 21st of March 2024
            /\b(\w+)\s+(\d{1,2})th?\s+(\d{4})\b/,    // March 21st 2024
            /\b(\d{1,2})\s+(\w+)\s+(\d{4})\b/         // 21 March 2024
        ],
        hi: [
            /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/,     // DD/MM/YYYY
            /\b(\d{1,2})[-\s](\d{1,2})[-\s](\d{4})\b/, // DD-MM-YYYY or DD MM YYYY
            /\b(\d{1,2})\s+(\w+)\s+(\d{4})\b/         // 21 मार्च 2024
        ],
        te: [
            /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/,     // DD/MM/YYYY
            /\b(\d{1,2})[-\s](\d{1,2})[-\s](\d{4})\b/, // DD-MM-YYYY or DD MM YYYY
            /\b(\d{1,2})\s+(\w+)\s+(\d{4})\b/         // 21 మార్చి 2024
        ]
    };

    // Month names in different languages
    const monthNames = {
        en: {
            'january': '01', 'february': '02', 'march': '03', 'april': '04',
            'may': '05', 'june': '06', 'july': '07', 'august': '08',
            'september': '09', 'october': '10', 'november': '11', 'december': '12'
        },
        hi: {
            'जनवरी': '01', 'फरवरी': '02', 'मार्च': '03', 'अप्रैल': '04',
            'मई': '05', 'जून': '06', 'जुलाई': '07', 'अगस्त': '08',
            'सितंबर': '09', 'अक्टूबर': '10', 'नवंबर': '11', 'दिसंबर': '12'
        },
        te: {
            'జనవరి': '01', 'ఫిబ్రవరి': '02', 'మార్చి': '03', 'ఏప్రిల్': '04',
            'మే': '05', 'జూన్': '06', 'జూలై': '07', 'ఆగస్టు': '08',
            'సెప్టెంబర్': '09', 'అక్టోబర్': '10', 'నవంబర్': '11', 'డిసెంబర్': '12'
        }
    };

    // Try each pattern for the current language
    for (const pattern of datePatterns[language]) {
        const match = transcript.match(pattern);
        if (match) {
            let day, month, year;
            
            // Handle different date formats
            if (pattern.toString().includes('\\b(\\d{1,2})th\\s+of\\s+(\\w+)\\s+(\\d{4})\\b')) {
                // Format: "21st of March 2024"
                day = match[1].padStart(2, '0');
                month = monthNames[language][match[2].toLowerCase()];
                year = match[3];
            } else if (pattern.toString().includes('\\b(\\w+)\\s+(\\d{1,2})th?\\s+(\\d{4})\\b')) {
                // Format: "March 21st 2024"
                month = monthNames[language][match[1].toLowerCase()];
                day = match[2].padStart(2, '0');
                year = match[3];
            } else if (pattern.toString().includes('\\b(\\d{1,2})\\s+(\\w+)\\s+(\\d{4})\\b')) {
                // Format: "21 March 2024"
                day = match[1].padStart(2, '0');
                month = monthNames[language][match[2].toLowerCase()];
                year = match[3];
            } else {
                // Format: "DD/MM/YYYY" or "DD-MM-YYYY"
                day = match[1].padStart(2, '0');
                month = match[2].padStart(2, '0');
                year = match[3];
            }

            // Validate the date
            const date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) {
                return `${year}-${month}-${day}`;
            }
        }
    }

    return null;
}

// Handle voice input for account opening form
function handleAccountOpeningVoiceInput(field, transcript) {
    const fieldName = field.name || field.id;
    console.log('Processing field:', fieldName, 'with transcript:', transcript);

    // Handle select dropdowns
    if (field.tagName === 'SELECT') {
        const selectValue = transcript.toLowerCase();
        if (selectValue.includes('savings')) {
            field.value = 'savings';
        } else if (selectValue.includes('current')) {
            field.value = 'current';
        }
        return;
    }

    // Handle date fields
    if (field.type === 'date') {
        const dateValue = parseDateFromVoice(transcript, selectedLanguage);
        if (dateValue) {
            field.value = dateValue;
        }
        return;
    }

    // Handle number fields
    if (field.type === 'number') {
        const numberMatch = transcript.match(/\d+/g);
        if (numberMatch) {
            field.value = numberMatch.join('');
        }
        return;
    }

    // Handle text fields based on field name
    switch(fieldName) {
        case 'full-name':
        case 'name':
            field.value = transcript;
            break;
        case 'dob':
        case 'date-of-birth':
            const dateValue = parseDateFromVoice(transcript, selectedLanguage);
            if (dateValue) {
                field.value = dateValue;
            }
            break;
        case 'gender':
            if (transcript.toLowerCase().includes('male')) {
                field.value = 'male';
            } else if (transcript.toLowerCase().includes('female')) {
                field.value = 'female';
            } else if (transcript.toLowerCase().includes('other')) {
                field.value = 'other';
            }
            break;
        case 'nationality':
            field.value = transcript;
            break;
        case 'email':
            field.value = transcript;
            break;
        case 'phone':
        case 'phone-number':
            // Extract numbers from transcript
            const phoneMatch = transcript.match(/\d+/g);
            if (phoneMatch) {
                field.value = phoneMatch.join('');
            }
            break;
        case 'address':
            field.value = transcript;
            break;
        case 'city':
            field.value = transcript;
            break;
        case 'state':
            field.value = transcript;
            break;
        case 'country':
            field.value = transcript;
            break;
        case 'zipcode':
        case 'zip-code':
            // Extract numbers from transcript
            const zipMatch = transcript.match(/\d+/g);
            if (zipMatch) {
                field.value = zipMatch.join('');
            }
            break;
        case 'occupation':
            field.value = transcript;
            break;
        case 'annual-income':
        case 'income':
            // Extract numbers from transcript
            const incomeMatch = transcript.match(/\d+/g);
            if (incomeMatch) {
                field.value = incomeMatch.join('');
            }
            break;
        case 'account-type':
            if (transcript.toLowerCase().includes('savings')) {
                field.value = 'savings';
            } else if (transcript.toLowerCase().includes('current')) {
                field.value = 'current';
            }
            break;
        case 'id-number':
        case 'id':
            // Extract numbers from transcript
            const idMatch = transcript.match(/\d+/g);
            if (idMatch) {
                field.value = idMatch.join('');
            }
            break;
        case 'mothers-name':
        case 'mother-name':
            field.value = transcript;
            break;
        case 'nominee-name':
        case 'nominee':
            field.value = transcript;
            break;
        case 'nominee-relationship':
        case 'relationship':
            field.value = transcript;
            break;
        default:
            console.log('Unhandled field:', fieldName);
    }

    // Trigger input and change events to ensure form validation
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('change'));
}

// Function to handle deposit voice input
function handleDepositVoiceInput(field, transcript) {
    console.log('Handling deposit voice input for field:', field.id, 'with transcript:', transcript);
    
    // Handle denomination fields
    if (field.id.startsWith('d')) {
        // Convert text to number
        const number = convertTextToNumber(transcript, selectedLanguage);
        if (number !== null) {
            field.value = number;
            // Trigger input event to update total
            field.dispatchEvent(new Event('input'));
            
            // Focus the next denomination field
            const denominationFields = ['d2000', 'd500', 'd200', 'd100', 'd50', 'd20', 'd10', 'd5', 'd2', 'd1'];
            const currentIndex = denominationFields.indexOf(field.id);
            if (currentIndex < denominationFields.length - 1) {
                const nextField = document.getElementById(denominationFields[currentIndex + 1]);
                if (nextField) {
                    nextField.focus();
                }
            }
        }
        return;
    }
    
    // Handle other fields
    switch(field.id) {
        case 'branchName':
            field.value = transcript;
            break;
        case 'accountNumber':
            // Extract only numbers from transcript
            const accountNumber = transcript.replace(/\D/g, '');
            field.value = accountNumber;
            break;
        case 'accountHolderName':
            field.value = transcript;
            break;
        case 'amount':
            // Convert text to number
            const amount = convertTextToNumber(transcript, selectedLanguage);
            if (amount !== null) {
                field.value = amount;
            }
            break;
        case 'depositMode':
            // Check for keywords in transcript
            if (transcript.toLowerCase().includes('cash')) {
                field.value = 'cash';
            } else if (transcript.toLowerCase().includes('cheque')) {
                field.value = 'cheque';
            }
            break;
        case 'chequeNumber':
            // Extract only numbers from transcript
            const chequeNumber = transcript.replace(/\D/g, '');
            field.value = chequeNumber;
            break;
        case 'chequeBankName':
            field.value = transcript;
            break;
    }
}

// Function to convert text to number
function convertTextToNumber(text, language) {
    // Remove any currency symbols and extra spaces
    text = text.replace(/[₹$]/g, '').trim();
    
    // Define number words for each language
    const numberWords = {
        en: {
            'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
            'hundred': 100, 'thousand': 1000, 'lakh': 100000, 'crore': 10000000,
            'million': 1000000, 'billion': 1000000000
        },
        hi: {
            'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5,
            'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
            'सौ': 100, 'हज़ार': 1000, 'लाख': 100000, 'करोड़': 10000000
        },
        te: {
            'ఒక': 1, 'రెండు': 2, 'ముగ్దు': 3, 'నాలుగు': 4, 'అయిదు': 5,
            'ఆరు': 6, 'ఏడు': 7, 'ఎనిమిది': 8, 'తొమ్మిది': 9, 'పది': 10,
            'వంద': 100, 'వెయ్యి': 1000, 'లక్ష': 100000, 'కోటి': 10000000
        }
    };

    // First try to extract numbers directly
    const numbers = text.match(/\d+/g);
    if (numbers && numbers.length > 0) {
        return parseInt(numbers[0]);
    }

    // If no numbers found, try to convert text to number
    const words = text.toLowerCase().split(/\s+/);
    let result = 0;
    let currentNumber = 0;

    for (let word of words) {
        const num = numberWords[language][word];
        if (num) {
            if (num >= 1000) {
                if (currentNumber === 0) currentNumber = 1;
                currentNumber *= num;
                result += currentNumber;
                currentNumber = 0;
            } else if (num >= 100) {
                if (currentNumber === 0) currentNumber = 1;
                currentNumber *= num;
            } else {
                currentNumber += num;
            }
        }
    }

    result += currentNumber;
    return result || null;
}

// Handle voice input for withdraw form
function handleWithdrawVoiceInput(field, transcript) {
    const fieldName = field.name || field.id;
    console.log('Processing withdraw field:', fieldName, 'with transcript:', transcript);

    switch(fieldName) {
        case 'branchName':
            field.value = transcript;
            break;
        case 'date':
            // Extract date from transcript
            const dateValue = parseDateFromVoice(transcript, selectedLanguage);
            if (dateValue) {
                field.value = dateValue;
            }
            break;
        case 'accountNumber':
            // Extract numbers from transcript
            const accountMatch = transcript.match(/\d+/g);
            if (accountMatch) {
                field.value = accountMatch.join('');
            }
            break;
        case 'accountHolderName':
            field.value = transcript;
            break;
        case 'amount':
            // Try to convert text to number first
            const convertedAmount = convertTextToNumber(transcript, selectedLanguage);
            if (convertedAmount > 0) {
                field.value = convertedAmount;
            } else {
                // Fallback to extracting numbers if text conversion fails
                const amountMatch = transcript.match(/\d+/g);
                if (amountMatch) {
                    field.value = amountMatch.join('');
                }
            }
            break;
        case 'withdrawalMode':
            if (transcript.toLowerCase().includes('cash')) {
                field.value = 'cash';
                document.getElementById('chequeDetailsGroup').style.display = 'none';
            } else if (transcript.toLowerCase().includes('cheque')) {
                field.value = 'cheque';
                document.getElementById('chequeDetailsGroup').style.display = 'block';
            }
            break;
        case 'chequeNumber':
            // Extract numbers from transcript
            const chequeMatch = transcript.match(/\d+/g);
            if (chequeMatch) {
                field.value = chequeMatch.join('');
            }
            break;
        case 'chequeBankName':
            field.value = transcript;
            break;
        default:
            console.log('Unhandled withdraw field:', fieldName);
    }
}

// Update voice status based on current field
function updateVoiceStatus() {
    const currentField = document.activeElement;
    if (!currentField || !currentField.tagName) return;

    const statusDiv = document.getElementById('voiceStatus');
    if (!statusDiv) return;

    const fieldName = currentField.name || currentField.id;
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    let statusMessage = '';
    switch(currentPage) {
        case 'account-opening.html':
            statusMessage = `Ready to fill ${fieldName} for account opening`;
            break;
        case 'deposit.html':
            statusMessage = `Ready to fill ${fieldName} for deposit`;
            break;
        case 'withdraw.html':
            statusMessage = `Ready to fill ${fieldName} for withdrawal`;
            break;
        default:
            statusMessage = `Ready to fill ${fieldName}`;
    }

    statusDiv.textContent = statusMessage;
}

// Setup form field click handlers
function setupFormFieldsClickHandlers() {
    // Get all forms on the page
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        // Get all form fields
        const fields = form.querySelectorAll('input, select, textarea');
        
        fields.forEach(field => {
            // Skip if this is the language selector
            if (field.id === 'languageSelect' || field.closest('.language-selector')) {
                return;
            }
            
            field.addEventListener('focus', () => {
                currentField = field;
                lastFocusedField = field;
                updateVoiceStatus();
                startRecording();
            });
        });
    });
}

// Function to get field instruction based on field and language
function getFieldInstruction(field, language) {
    const fieldName = field.name || field.id;
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    const instructions = {
        en: {
            // Common fields
            'branchName': 'Please enter your branch name',
            'accountNumber': 'Please enter your 12-digit account number',
            'accountHolderName': 'Please enter your full name',
            'amount': 'Please enter the amount you want to ' + (getCurrentTransactionType() === 'deposit' ? 'deposit' : 'withdraw'),
            
            // Deposit/Withdraw specific fields
            'depositMode': 'Please select the mode of deposit',
            'withdrawalMode': 'Please select the mode of withdrawal',
            'chequeNumber': 'Please enter the cheque number',
            'chequeBankName': 'Please enter the bank name',
            'denominationDetails': 'Please enter the denomination details',
            
            // Account opening specific fields
            'full-name': 'Please enter your full name',
            'dob': 'Please enter your date of birth',
            'gender': 'Please select your gender',
            'nationality': 'Please enter your nationality',
            'email': 'Please enter your email address',
            'phone': 'Please enter your phone number',
            'address': 'Please enter your address',
            'city': 'Please enter your city',
            'state': 'Please enter your state',
            'country': 'Please enter your country',
            'zipcode': 'Please enter your zip code',
            'occupation': 'Please enter your occupation',
            'annual-income': 'Please enter your annual income',
            'account-type': 'Please select your account type',
            'id-number': 'Please enter your ID number',
            'mothers-name': 'Please enter your mother\'s name',
            'nominee-name': 'Please enter your nominee\'s name',
            'nominee-relationship': 'Please enter your relationship with the nominee'
        },
        hi: {
            // Common fields
            'branchName': 'कृपया अपनी शाखा का नाम दर्ज करें',
            'accountNumber': 'कृपया अपना 12 अंकों का खाता नंबर दर्ज करें',
            'accountHolderName': 'कृपया अपना पूरा नाम दर्ज करें',
            'amount': 'कृपया ' + (getCurrentTransactionType() === 'deposit' ? 'जमा करने के लिए' : 'निकालने के लिए') + ' राशि दर्ज करें',
            
            // Deposit/Withdraw specific fields
            'depositMode': 'कृपया जमा का माध्यम चुनें',
            'withdrawalMode': 'कृपया निकासी का माध्यम चुनें',
            'chequeNumber': 'कृपया चेक नंबर दर्ज करें',
            'chequeBankName': 'कृपया बैंक का नाम दर्ज करें',
            'denominationDetails': 'कृपया नोटों का विवरण दर्ज करें',
            
            // Account opening specific fields
            'full-name': 'कृपया अपना पूरा नाम दर्ज करें',
            'dob': 'कृपया अपनी जन्म तिथि दर्ज करें',
            'gender': 'कृपया अपना लिंग चुनें',
            'nationality': 'कृपया अपनी राष्ट्रीयता दर्ज करें',
            'email': 'कृपया अपना ईमेल पता दर्ज करें',
            'phone': 'कृपया अपना फोन नंबर दर्ज करें',
            'address': 'कृपया अपना पता दर्ज करें',
            'city': 'कृपया अपने शहर का नाम दर्ज करें',
            'state': 'कृपया अपने राज्य का नाम दर्ज करें',
            'country': 'कृपया अपने देश का नाम दर्ज करें',
            'zipcode': 'कृपया अपना पिन कोड दर्ज करें',
            'occupation': 'कृपया अपना व्यवसाय दर्ज करें',
            'annual-income': 'कृपया अपनी वार्षिक आय दर्ज करें',
            'account-type': 'कृपया अपना खाता प्रकार चुनें',
            'id-number': 'कृपया अपना पहचान संख्या दर्ज करें',
            'mothers-name': 'कृपया अपनी माता का नाम दर्ज करें',
            'nominee-name': 'कृपया अपने नॉमिनी का नाम दर्ज करें',
            'nominee-relationship': 'कृपया अपने नॉमिनी से रिश्ता दर्ज करें'
        },
        te: {
            // Common fields
            'branchName': 'దయచేసి మీ శాఖ పేరు నమోదు చేయండి',
            'accountNumber': 'దయచేసి మీ 12 అంకెల ఖాతా సంఖ్య నమోదు చేయండి',
            'accountHolderName': 'దయచేసి మీ పూర్తి పేరు నమోదు చేయండి',
            'amount': 'దయచేసి ' + (getCurrentTransactionType() === 'deposit' ? 'డిపాజిట్' : 'ఉపసంహరించడానికి') + ' మొత్తం నమోదు చేయండి',
            
            // Deposit/Withdraw specific fields
            'depositMode': 'దయచేసి డిపాజిట్ మోడ్ ఎంచుకోండి',
            'withdrawalMode': 'దయచేసి ఉపసంహరణ మోడ్ ఎంచుకోండి',
            'chequeNumber': 'దయచేసి చెక్ సంఖ్య నమోదు చేయండి',
            'chequeBankName': 'దయచేసి బ్యాంక్ పేరు నమోదు చేయండి',
            'denominationDetails': 'దయచేసి నోట్ల వివరాలు నమోదు చేయండి',
            
            // Account opening specific fields
            'full-name': 'దయచేసి మీ పూర్తి పేరు నమోదు చేయండి',
            'dob': 'దయచేసి మీ పుట్టిన తేది నమోదు చేయండి',
            'gender': 'దయచేసి మీ లింగం ఎంచుకోండి',
            'nationality': 'దయచేసి మీ జాతీయత నమోదు చేయండి',
            'email': 'దయచేసి మీ ఇమెయిల్ చిరునామా నమోదు చేయండి',
            'phone': 'దయచేసి మీ ఫోన్ నంబర్ నమోదు చేయండి',
            'address': 'దయచేసి మీ చిరునామా నమోదు చేయండి',
            'city': 'దయచేసి మీ నగరం పేరు నమోదు చేయండి',
            'state': 'దయచేసి మీ రాష్ట్రం పేరు నమోదు చేయండి',
            'country': 'దయచేసి మీ దేశం పేరు నమోదు చేయండి',
            'zipcode': 'దయచేసి మీ పిన్ కోడ్ నమోదు చేయండి',
            'occupation': 'దయచేసి మీ వృత్తి నమోదు చేయండి',
            'annual-income': 'దయచేసి మీ వార్షిక ఆదాయం నమోదు చేయండి',
            'account-type': 'దయచేసి మీ ఖాతా రకం ఎంచుకోండి',
            'id-number': 'దయచేసి మీ గుర్తింపు సంఖ్య నమోదు చేయండి',
            'mothers-name': 'దయచేసి మీ తల్లి పేరు నమోదు చేయండి',
            'nominee-name': 'దయచేసి మీ నామినీ పేరు నమోదు చేయండి',
            'nominee-relationship': 'దయచేసి మీ నామినీతో సంబంధం నమోదు చేయండి'
        }
    };

    return instructions[language][fieldName] || 'Please enter your information';
}

// Function to read field instructions and start recording
function readFieldInstructionsAndRecord(field, language) {
    console.log('Reading instructions for field:', field.name || field.id, 'in language:', language);
    
    const instruction = getFieldInstruction(field, language);
    console.log('Instruction:', instruction);
    
    const utterance = new SpeechSynthesisUtterance(instruction);
    
    // Set voice based on language
    switch(language) {
        case 'hi':
            utterance.lang = 'hi-IN';
            if (window.hindiVoice) {
                utterance.voice = window.hindiVoice;
            }
            break;
        case 'te':
            utterance.lang = 'te-IN';
            if (window.teluguVoice) {
                utterance.voice = window.teluguVoice;
            }
            break;
        default:
            utterance.lang = 'en-US';
            if (window.englishVoice) {
                utterance.voice = window.englishVoice;
            }
    }
    
    // Set speech rate and pitch
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // When instructions finish, start recording
    utterance.onend = () => {
        console.log('Instructions finished, starting recording');
        if (!isRecording) {
            startRecording();
        }
    };
    
    // Stop any ongoing speech before starting new one
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

// Update the field focus event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
    // Initialize speech recognition
    initializeSpeechRecognition();

    // Get the language selector first
    const languageSelect = document.getElementById('languageSelect');
    
    // Add focus event listeners to form fields
    const formFields = document.querySelectorAll('input, select, textarea');
    console.log('Found form fields:', formFields.length);
    
    formFields.forEach(field => {
        // Skip the language selector
        if (field === languageSelect) {
            return;
        }
        
        field.addEventListener('focus', function() {
            console.log('Field focused:', this.name || this.id);
            // Start recording when field is focused
            startRecording();
        });
    });

    // Handle language selector separately
    if (languageSelect) {
        languageSelect.addEventListener('focus', function(e) {
            e.stopPropagation();
            return;
        });

        languageSelect.addEventListener('change', function(e) {
            console.log('Language changed to:', this.value);
            selectedLanguage = this.value;
            updateLanguageUI(selectedLanguage);
        });
    }

    // Setup floating voice button
    const voiceBtn = document.getElementById('floatingVoiceBtn');
    if (voiceBtn) {
        voiceBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Store the current focused field before starting recording
            lastFocusedField = document.activeElement;
            
            if (isRecording) {
                stopRecording();
        } else {
                startRecording();
            }
        });
    }

    // Setup form field click handlers
    setupFormFieldsClickHandlers();
});

// Generate a unique session ID for each form session
const sessionId = uuid.v4();

// Function to save voice recording
async function saveVoiceRecording(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('page_type', getCurrentPageType());
    formData.append('session_id', sessionId);

    try {
        const response = await fetch('/api/record-voice', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (!data.success) {
            console.error('Failed to save voice recording:', data.message);
        }
    } catch (error) {
        console.error('Error saving voice recording:', error);
    }
}

// Function to save generated PDF
async function saveGeneratedPDF(pdfBlob) {
    const formData = new FormData();
    formData.append('pdf', pdfBlob);
    formData.append('page_type', getCurrentPageType());
    formData.append('session_id', sessionId);

    try {
        const response = await fetch('/api/save-pdf', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (!data.success) {
            console.error('Failed to save PDF:', data.message);
        }
    } catch (error) {
        console.error('Error saving PDF:', error);
    }
}

// Function to get current page type
function getCurrentPageType() {
    const path = window.location.pathname;
    if (path.includes('deposit')) return 'deposit';
    if (path.includes('withdraw')) return 'withdraw';
    if (path.includes('account-opening')) return 'account-opening';
    return 'unknown';
}

// Initialize speech synthesis voices
function initializeSpeechSynthesis() {
    console.log('Initializing speech synthesis');
    
    // Function to load voices
    function loadVoices() {
        const voices = window.speechSynthesis.getVoices();
        console.log('Available voices:', voices);
        
        // Log available languages
        const languages = new Set(voices.map(voice => voice.lang));
        console.log('Available languages:', languages);
        
        // Set default voice for each language
        voices.forEach(voice => {
            if (voice.lang.startsWith('en')) {
                window.englishVoice = voice;
            } else if (voice.lang.startsWith('hi')) {
                window.hindiVoice = voice;
            } else if (voice.lang.startsWith('te')) {
                window.teluguVoice = voice;
            }
        });
    }

    // Load voices immediately if they're available
    loadVoices();

    // Also load voices when they change
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
} 