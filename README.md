# GreenRoute Application for CO2 Emission Tracking and Route Optimization 

GreenRoute is a web-based application designed to calculate and visualize CO2 emissions for transportation routes in India. Built with HTML, CSS, and JavaScript, it leverages APIs like Leaflet for map visualization, OpenStreetMap Nominatim for geocoding, OSRM for routing, and Google Gemini for generating sustainability insights. The app helps logistics companies estimate emissions based on vehicle type, fuel, terrain, road type, and load weight, following ISO 14083 and GLEC Framework standards.
Features

Interactive Map: Displays routes, city markers, and a heatmap of emissions using Leaflet.
CO2 Emissions Calculation: Computes Tank-to-Wheel (TTW), Well-to-Tank (WTT), and Well-to-Wheel (WTW) emissions.
City-wise Emissions: Breaks down emissions for cities along the route.
Fuel Comparison: Compares emissions for diesel, petrol, and electric vehicles.
AI-Generated Reasoning: Provides a professional explanation of emissions using the Gemini API.
Responsive Design: Works on desktop and mobile devices with a clean, user-friendly interface.
Reset Functionality: Clears inputs and map for new calculations.

Prerequisites

A modern web browser (e.g., Chrome, Firefox, Edge).
Internet connection for external APIs and dependencies.
A valid Google Gemini API key for reasoning generation.

Installation

Clone or download the project files to a local directory:git clone <repository-url>


Ensure the following files are in the same directory:
index.html
styles.css
script.js


Open script.js and replace the placeholder API_KEY with your Google Gemini API key:const API_KEY = 'your-gemini-api-key-here';


Host the files on a local server (recommended) or open index.html directly in a browser:
For a local server, use tools like http-server (Node.js) or Python's http.server:python -m http.server 8000

Then navigate to http://localhost:8000 in your browser.



Usage

Open index.html in a web browser.
Select the following options from the form:
Start City and End City (e.g., Mumbai, Delhi).
Vehicle Type (Truck or Van).
Fuel Type (Diesel B7, Petrol, Electric).
Terrain (Flat, Hilly, Mountainous).
Road Type (Highway, Urban, Rural).
Load Weight (in kg).
Optimization Goal (Distance, Time, Emissions).


Click Fetch Trip Data to calculate emissions and display:
A map with the route, city markers, and emissions heatmap.
A trip summary (distance, duration, emissions).
City-wise emissions breakdown.
AI-generated reasoning for sustainability insights.


Click Reset to clear the form and map for a new calculation.
Hover over city emission boxes to view TTW and WTW emissions in a tooltip.

API Key Requirements

Google Gemini API: Required for generating the reasoning section. Obtain a key from Google Cloud Console and replace the placeholder in script.js.
Note: Without a valid Gemini API key, the app uses a fallback mock response for reasoning.

File Structure
greenroute/
├── index.html      # Main HTML file with structure and links to CSS/JS
├── styles.css      # CSS for styling the interface
├── script.js       # JavaScript for map rendering, API calls, and logic
└── README.md       # Project documentation

Dependencies
The application relies on external APIs and libraries, loaded via CDN or API endpoints:

Leaflet (v1.9.4): For interactive maps and heatmaps.
https://unpkg.com/leaflet@1.9.4/dist/leaflet.js
https://unpkg.com/leaflet@1.9.4/dist/leaflet.css
https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js


OpenStreetMap Nominatim: For geocoding and reverse geocoding.
https://nominatim.openstreetmap.org


OSRM (Open Source Routing Machine): For route calculation.
http://router.project-osrm.org


Google Gemini API: For generating reasoning text.
https://generativelanguage.googleapis.com


Cloudflare Challenge Platform: For bot protection (embedded in index.html).

Limitations

API Dependency: Requires an internet connection for external APIs.
Gemini API Key: A valid key is needed for full functionality; otherwise, a mock response is used.
Simplified Emissions: City-wise emissions are split evenly, which may not reflect real-world variations.
Optimization: The optimize parameter (distance, time, emissions) currently uses the same OSRM driving profile, limiting differentiation.
Rate Limits: Public APIs (Nominatim, OSRM) may have usage limits; consider hosting local instances for heavy use.

Potential Improvements

Add support for custom emission factors or real-time fuel efficiency data.
Implement advanced route optimization for emissions using alternative routing APIs.
Enhance city-wise emissions with segment-specific calculations.
Add offline support or caching for API responses.
Include unit tests for JavaScript functions.

License
This project is licensed under the MIT License. See the LICENSE file for details (not included in this repository yet).

For issues or contributions, please open a pull request or contact the project maintainer.
