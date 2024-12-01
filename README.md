# Indoor Environment Monitor - Sample Project

This project demonstrates how to retrieve time-series data of indoor temperature, humidity, and pressure stored in **InfluxDB Cloud** and display the data using **Recharts** in a React application.

## Features

- Fetches time-series data for temperature, humidity, and pressure from **InfluxDB Cloud**.
- Displays the data in an interactive chart using **Recharts**.
- Supports real-time updates with clear and intuitive visualization.

## Prerequisites

Ensure you have the following installed:

- **Node.js** (v20 or later recommended, includes npm)
- An **InfluxDB Cloud** account

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/nabeo114/recharts-env-monitor.git
    cd recharts-env-monitor
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Configure environment variables:
    
    Create a `.env` file in the root directory with the following content:

    ```
    REACT_APP_INFLUXDB_URL=<Your InfluxDB URL>
    REACT_APP_INFLUXDB_ORG=<Your InfluxDB Organization>
    REACT_APP_INFLUXDB_BUCKET=<Your InfluxDB Bucket>
    REACT_APP_INFLUXDB_TOKEN=<Your InfluxDB Token>
    ```

    Replace `<Your InfluxDB URL>` and other placeholders with your **InfluxDB Cloud** credentials.

## Usage

1. Start the development server:
    ```bash
    npm start
    ```

2. Open your browser and navigate to [http://localhost:3000](http://localhost:3000).

## Charts Overview

The app displays the following metrics using **Recharts**:

1. **Temperature (℃)**: Shows the indoor temperature trends over time.
2. **Humidity (%)**: Tracks the changes in indoor humidity.
3. **Pressure (hPa)**: Monitors atmospheric pressure variations.

### Chart Features
- **Interactive Tooltips**: Hover over the chart to view detailed data for each timestamp.
- **Formatted Axes**: X-axis displays time, and Y-axis adapts to the metric's unit.
- **Dynamic Updates**: Automatically reflects the latest data in real-time.
