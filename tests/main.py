import requests
import json
import os

def check_taxi_chart_urls(file_path):
    """
    Checks the existence of taxi chart URLs from a JSON file.

    Args:
        file_path (str): The path to the JSON file containing airport data.

    Returns:
        dict: A dictionary where keys are airport ICAO codes and values are
              dictionaries indicating 'status' (True if exists, False otherwise)
              and 'status_code' (HTTP status code) or 'error'.
    """
    results = {}
    airports_data = {}

    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return {}

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            airports_data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from {file_path}: {e}")
        return {}
    except Exception as e:
        print(f"An unexpected error occurred while reading {file_path}: {e}")
        return {}

    for icao, airport_info in airports_data.items():
        url = airport_info.get("taxi_chart_url")
        if url:
            try:
                # Use HEAD request to avoid downloading the entire content
                response = requests.head(url, timeout=10)  # Increased timeout for robustness
                if response.status_code == 200:
                    results[icao] = {"status": True, "status_code": 200}
                else:
                    results[icao] = {
                        "status": False,
                        "status_code": response.status_code,
                    }
            except requests.exceptions.RequestException as e:
                results[icao] = {"status": False, "error": str(e)}
        else:
            results[icao] = {"status": False, "error": "No taxi_chart_url found"}
    return results

# Define the path to your JSON file
json_file_name = "charts.json"

# Run the check
print(f"Checking URLs from {json_file_name}...")
results = check_taxi_chart_urls(json_file_name)

if results: # Only proceed if results are not empty (meaning file was read successfully)
    # Print a summary of all results
    print("\n--- URL Check Results ---")
    for icao, status in results.items():
        # Get the airport name for better readability
        airport_name = "Unknown Airport"
        try:
            with open(json_file_name, "r", encoding="utf-8") as f:
                temp_data = json.load(f)
                airport_name = temp_data.get(icao, {}).get("name", "Unknown Airport")
        except:
            pass # Ignore errors if we can't re-read for name for some reason

        if status["status"]:
            print(f"✅ {icao} - {airport_name}: OK (Status Code: {status['status_code']})")
        else:
            if "error" in status:
                print(
                    f"❌ {icao} - {airport_name}: FAILED (Error: {status['error']})"
                )
            else:
                print(
                    f"❌ {icao} - {airport_name}: FAILED (Status Code: {status['status_code']})"
                )