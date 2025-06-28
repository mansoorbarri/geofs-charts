import requests
import json
import os

def check_url_status(url, timeout=10):
    """
    Checks the existence and accessibility of a given URL.

    Args:
        url (str): The URL to check.
        timeout (int): The maximum number of seconds to wait for a response.

    Returns:
        dict: A dictionary with 'status' (True/False) and 'status_code' or 'error'.
    """
    try:
        response = requests.head(url, timeout=timeout, allow_redirects=True)
        if response.status_code == 200:
            return {"status": True, "status_code": 200}
        else:
            return {"status": False, "status_code": response.status_code}
    except requests.exceptions.RequestException as e:
        return {"status": False, "error": str(e)}

def check_airport_urls(file_path):
    """
    Checks the existence of taxi chart and info URLs from a JSON file.

    Args:
        file_path (str): The path to the JSON file containing airport data.

    Returns:
        dict: A nested dictionary where keys are airport ICAO codes.
              Each airport's value is another dictionary containing results for:
              'taxi_chart_url': {'status': bool, 'status_code': int | str}
              'info_url': {'status': bool, 'status_code': int | str}
              and 'name': str
    """
    all_results = {}
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
        airport_name = airport_info.get("name", "Unknown Airport")
        icao_results = {"name": airport_name}

        # Check taxi_chart_url
        taxi_url = airport_info.get("taxi_chart_url")
        if taxi_url:
            icao_results["taxi_chart_url"] = check_url_status(taxi_url)
        else:
            icao_results["taxi_chart_url"] = {"status": False, "error": "No taxi_chart_url found"}

        # Check info_url
        info_url = airport_info.get("info_url")
        if info_url:
            icao_results["info_url"] = check_url_status(info_url)
        else:
            icao_results["info_url"] = {"status": False, "error": "No info_url found"}

        all_results[icao] = icao_results
    return all_results

# Define the path to your JSON file
json_file_name = "charts.json"

# Run the check
print(f"Checking URLs from {json_file_name}...")
results = check_airport_urls(json_file_name)

if results: # Only proceed if results are not empty
    print("\n--- URL Check Results ---")
    for icao, airport_results in results.items():
        airport_name = airport_results.get("name", "Unknown Airport")
        print(f"\n✈️ {icao} - {airport_name}:")

        # Report for taxi_chart_url
        taxi_chart_status = airport_results.get("taxi_chart_url", {})
        if taxi_chart_status.get("status"):
            print(
                f"  ✅ Taxi Chart URL: OK (Status Code: {taxi_chart_status.get('status_code')})"
            )
        else:
            if "error" in taxi_chart_status:
                print(
                    f"  ❌ Taxi Chart URL: FAILED (Error: {taxi_chart_status.get('error')})"
                )
            else:
                print(
                    f"  ❌ Taxi Chart URL: FAILED (Status Code: {taxi_chart_status.get('status_code')})"
                )

        # Report for info_url
        info_url_status = airport_results.get("info_url", {})
        if info_url_status.get("status"):
            print(
                f"  ✅ Info URL: OK (Status Code: {info_url_status.get('status_code')})"
            )
        else:
            if "error" in info_url_status:
                print(
                    f"  ❌ Info URL: FAILED (Error: {info_url_status.get('error')})"
                )
            else:
                print(
                    f"  ❌ Info URL: FAILED (Status Code: {info_url_status.get('status_code')})"
                )