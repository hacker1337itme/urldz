import fs from 'fs';
import readline from 'readline';
import http from 'http';
import https from 'https';
import pLimit from 'p-limit'; // Importing p-limit as an ES module
import chalk from 'chalk'; // Importing chalk for color output
import pkg from 'terminal-kit';
const { terminal } = pkg;
import gTTS from 'gtts';


import player from 'play-sound';

const play = player();


const timeout = 2; // Timeout in seconds

// Get the input filename from command-line arguments
const inputFileName = process.argv[2] || 'urls.txt';


function playAudio(filename) {
    play.play(filename, function(err) {
        if (err) {
            console.log(`Error playing audio: ${err}`);
        }
    });
}


function textToSpeech(text, filename) {
    const gtts = new gTTS(text, 'en');
    gtts.save(filename, (err, result) => {
        if (err) {
            throw new Error(err);
        }
        console.log(`START : ${filename}`);
    });
}

// Sample text to convert to speech
const text = "Hello, this is a text to speech conversion example using Node.js!";
const filename = "output.mp3";

textToSpeech(text, filename);
playAudio(filename);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Define a simple 3D ASCII object
const frames = [
  `
       /\\
      /  \\
     /    \\
    /      \\
   /        \\
  /__________\\
  |   _  _   |
  |  | || |  |
  |__|_||_|__|
  `,
  `
       /\\
      /  \\
     /    \\
    /      \\
   / DZ     \\
  /__________\\
  |   _  _   |
  |  | || |  |
  |__|_||_|__|

  `,
  `
      /\\
     /  \\
    /    \\	ALGERIA
   /      =======================\\
  /________-----------------------\\
  |  _ _    |			   ==
  | (_) |   ______________________|  |
  |_______________________________|_-|
    LAB
  `
];
// Function to clear the screen and display frames
const animate = async () => {
  // Clear the terminal
  terminal.clear();

  for (let i = 0; i < frames.length; i++) {
    // Display the current frame
    terminal(frames[i]);

    // Wait for a brief moment
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Clear the screen again for the next frame
    terminal.clear();
  }
  
  // End the animation
  terminal('Animation complete.\n');
  terminal.hideCursor();
};

// Start the animation
animate();

await sleep(7000); // Sleep for 2 seconds

const rd = readline.createInterface({
    input: fs.createReadStream(inputFileName),
    output: process.stdout,
    terminal: false
});

const limit = pLimit(5); // Limit to 5 concurrent requests
const results = []; // Store results for the output

// Function to get the current timestamp
function getCurrentTime() {
    return new Date().toLocaleString();
}

// Check if a site is alive based on the status code
function isSiteAlive(statusCode) {
    return statusCode >= 200 && statusCode < 400; // Success or redirect codes
}

// Process the response from the HTTP request
function processResponse(res, requestedHost, method) {
    const code = res.statusCode;
    const redirectedHost = res.headers['location'] || 'N/A';
    
    const status = isSiteAlive(code) ? chalk.green('Alive') : chalk.red('Not Alive');

    // Build result object
    const result = {
        URL: requestedHost,
        Method: method,
        StatusCode: code,
        Status: status,
        RedirectedTo: redirectedHost,
    };
    
    console.log(chalk.blue(`[${getCurrentTime()}]`), `Processed ${method} ${requestedHost} -> Status: ${code}, Status: ${status}`); // Debugging log
    results.push(result);

    // Print the result immediately after processing response
    printSingleResult(result);

}

// Function to make an HTTP request to the specified URL with the given method
function getUrl(method, url) {
    try {
        const parsedUrl = new URL(url);
        const options = {
            method: method,
            hostname: parsedUrl.hostname,
            port: parsedUrl.protocol === 'https:' ? 443 : 80,
            timeout: timeout * 1000, // Set timeout in milliseconds
        };

        const req = (parsedUrl.protocol === 'https:') ? https.request(options) : http.request(options);

        req.on('response', (res) => processResponse(res, url, method)); // Process the response
        req.on('error', function(e) {
            console.error(chalk.red(`[${getCurrentTime()}]`), `Request error for URL: ${url}, Method: ${method}, Error: ${e.message}`);
            results.push({ URL: url, Method: method, StatusCode: 'Error', Status: chalk.red('Not Reachable'), RedirectedTo: e.message });
        });

        req.setTimeout(timeout * 1000, () => {
            req.abort();
            console.error(chalk.red(`[${getCurrentTime()}]`), `Request to ${url} timed out`);
            results.push({ URL: url, Method: method, StatusCode: 'Timeout', Status: chalk.red('Not Reachable'), RedirectedTo: 'N/A' });
        });

        req.end();
    } catch (error) {
        console.error(chalk.red(`[${getCurrentTime()}]`), `Invalid URL: ${url}, Error: ${error.message}`);
        results.push({ URL: url, Method: method, StatusCode: 'Invalid URL', Status: chalk.red('Not Reachable'), RedirectedTo: error.message });
    }
}

// Custom function to print results in a readable format
// Function to print a single result immediately
function printSingleResult(result) {
    console.log(`${chalk.cyan('URL:')} ${result.URL}`);
    console.log(`  ${chalk.cyan('Method:')} ${result.Method}`);
    console.log(`  ${chalk.cyan('Status Code:')} ${result.StatusCode}`);
    console.log(`  ${chalk.cyan('Status:')} ${result.Status}`);
    console.log(`  ${chalk.cyan('Redirected To:')} ${result.RedirectedTo}`);
    console.log('---------------------------------------');
}

// Process each line of the input file
rd.on('line', function (line) {
    // Ignore comments and empty lines
    if (line[0] === '#' || line.trim() === '') {
        console.log(chalk.gray(`[${getCurrentTime()}] Ignoring line: ${line}`)); // Log ignored lines
        return;
    }

    // Split line into method and URL
    const parts = line.split(' ');
    const method = parts.length > 1 ? parts[0].toUpperCase() : 'HEAD';
    const url = parts.length > 1 ? parts[1] : parts[0];

    // Log what is being processed
    console.log(chalk.blue(`[${getCurrentTime()}]`), `Processing line: Method: ${method}, URL: ${url}`);

    // Validate the method
    const validMethods = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'TRACE'];
    if (!validMethods.includes(method)) {
        console.warn(chalk.yellow(`[${getCurrentTime()}] Invalid method format: ${method}`));
        results.push({ URL: url, Method: method, StatusCode: 'Invalid Method', Status: chalk.red('Not Reachable'), RedirectedTo: 'N/A' });
        return;
    }

    // Check the URL format
    if (url.startsWith('http://') || url.startsWith('https://')) {
        limit(() => getUrl(method, url.trim())); // Control concurrency
    } else {
        console.warn(chalk.yellow(`[${getCurrentTime()}] Invalid URL format: ${url}`));
        results.push({ URL: url, Method: method, StatusCode: 'Invalid Format', Status: chalk.red('Not Reachable'), RedirectedTo: 'N/A' });
    }


	
});


// After reading all lines, print results in a formatted output
rd.on('close', () => {
    // Print results in a custom format after processing all requests
    

});



// Handle any reading errors on the file
rd.on('error', function (err) {
    console.error(chalk.red(`[${getCurrentTime()}] Error reading file:`), err.message);
});

function finish() {
// Sample text to convert to speech
const textend = "HI SIR I JUST FINISH SCAN KEEP WORKING !";
const filenameend = "output.mp3";
textToSpeech(textend, filenameend);
playAudio(filenameend);
}

finish();
