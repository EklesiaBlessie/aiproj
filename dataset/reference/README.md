# BiryaniBox AI Product Manager Copilot - Synthetic Feedback Dataset (Final Version)

## Project Overview
This repository contains a refined, production-grade synthetic customer experience dataset engineered for the **AI Product Manager Copilot** B.Tech Final Year Project in the domain of **Restaurant Customer Feedback Analytics**.

**Brand:** BiryaniBox  
**Target Domain:** Multi-Channel Customer Experience & Product Intelligence Analytics  
**Total Records:** ~1,100 records across 10 channel CSV source files  
**Customer Registry:** 400 unique customer profiles (CUS0001 - CUS0400) with 100% referential consistency across all CSV files.

---

## Folder Structure
```text
dataset/
├── source_data/
│   ├── google_reviews.csv          (200 records - 14 columns)
│   ├── zomato_reviews.csv          (150 records - 13 columns)
│   ├── swiggy_reviews.csv          (150 records - 12 columns)
│   ├── uber_eats_reviews.csv       (100 records - 10 columns)
│   ├── customer_surveys.csv        (100 records - 11 columns)
│   ├── support_tickets.csv         (100 records - 9 columns)
│   ├── customer_emails.csv         (75 records - 7 columns)
│   ├── feature_requests.csv        (75 records - 8 columns)
│   ├── walkin_feedback.csv         (75 records - 9 columns)
│   └── social_media_feedback.csv   (75 records - 7 columns)
└── reference/
    ├── README.md                   (Project documentation)
    ├── data_dictionary.xlsx        (Column specifications & validation rules)
    ├── dataset_schema.xlsx         (Primary/Foreign key relationships & row counts)
    └── source_mapping.xlsx         (Channel source mapping to raw_feedback.csv)
```

---

## Restaurant Branches (RES001 - RES008)
- **RES001**: BiryaniBox Vijayawada (Vijayawada, Andhra Pradesh)
- **RES002**: BiryaniBox Guntur (Guntur, Andhra Pradesh)
- **RES003**: BiryaniBox Hyderabad (Hyderabad, Telangana)
- **RES004**: BiryaniBox Visakhapatnam (Visakhapatnam, Andhra Pradesh)
- **RES005**: BiryaniBox Bengaluru (Bengaluru, Karnataka)
- **RES006**: BiryaniBox Chennai (Chennai, Tamil Nadu)
- **RES007**: BiryaniBox Pune (Pune, Maharashtra)
- **RES008**: BiryaniBox Mumbai (Mumbai, Maharashtra)

---

## Data Collection & Synthesis Strategy
1. **Feedback Text Polish (50-120 Words):** Every review text has been generated with natural human writing, avoiding AI cliches, covering food quality, taste, packaging, delivery, staff behavior, pricing, payment, app experience, waiting times, parking, and feature requests.
2. **Review Titles:** Realistic, specific titles replacing generic labels.
3. **Customer Referential Consistency:** Every `customer_id` (e.g. `CUS0015`) maps deterministically to the same reviewer name, city, restaurant preference, and language across all CSV files.
4. **Target Noise Injection for Preprocessing Pipeline Testing:**
   - **Duplicate Rows:** ~3%
   - **Near Duplicate Rows:** ~2%
   - **Missing Ratings:** ~5%
   - **Missing Customer IDs:** ~2%
   - **HTML Tags:** ~3%
   - **URLs:** ~2%
   - **Emoji:** ~5%
   - **Extra Spaces:** ~5%
   - **Spelling Errors:** ~4%
   - **Mixed Capitalization:** ~5%
   - **Mixed Date Formats:** ~5% (`YYYY-MM-DD`, `DD/MM/YYYY`, `DD-MMM-YYYY`)
   - **Blank Optional Fields:** ~3%

---

## Merge Strategy & Future Pipeline
The 10 source CSVs are designed to be ingested by the AI Copilot Data Pipeline:
1. **Extraction & Ingestion:** Ingest all 10 CSVs into staging tables.
2. **Data Cleaning & Standardization:** Apply regex to strip HTML/URLs/Emojis, standardize date formats to `YYYY-MM-DD`, deduplicate rows, and impute missing ratings using sentiment NLP models.
3. **Unified Schema Merge:** Map into a single `raw_feedback.csv` according to `source_mapping.xlsx`.
4. **Sentiment & Aspect Categorization:** AI Product Manager Copilot classifies feedback into actionable product buckets (e.g., Packaging Improvements, App Payment Fixes, Menu Additions).
