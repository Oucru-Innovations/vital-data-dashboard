import json
import random
from faker import Faker
import logging

fake = Faker()

def generate_mock_data(num_entries=1000):
    # Sample study, file type, and date data
    studies = ["24EI", "24EIa", "24EIb", "05EI"]
    file_types = ["PPG", "ECG", "Gyro", "Ultrasound"]
    
    # Generate mock data
    mock_data = {
        "study": [],
        "fileType": [],
        "fileName": [],
        "fileSize": [],
        "duration": [],
        "date": []
    }
    
    for _ in range(num_entries):
        study = random.choice(studies)
        file_type = random.choice(file_types)
        file_name = f"file{_ + 1}.{file_type.lower()}"
        file_size = random.randint(10, 3000)  # Random file size between 10MB and 30MB
        duration = random.randint(2, 1500)  # Random duration between 5 and 15 minutes
        date = fake.date_this_year()  # Random date this year
        
        # Convert date to string format (YYYY-MM-DD)
        date_str = date.strftime("%Y-%m-%d")
        
        mock_data["study"].append(study)
        mock_data["fileType"].append(file_type)
        mock_data["fileName"].append(file_name)
        mock_data["fileSize"].append(file_size)
        mock_data["duration"].append(duration)
        mock_data["date"].append(date_str)

    return mock_data

if __name__ == "__main__":
    # Generate 1000 sample data
    data = generate_mock_data(1000)

    # Save to a JSON file
    with open('../src/mock/generated_detail_data.json', 'w') as f:
        json.dump(data, f, indent=4)

    logging.info("Mock data generated and saved to 'mock_data.json'")
