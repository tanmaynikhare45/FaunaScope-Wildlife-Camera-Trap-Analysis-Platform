# FaunaScope AI - Wildlife Camera Trap Analysis Platform

<div align="center">

![TrapSense AI](https://img.shields.io/badge/TrapSense-AI-green?style=for-the-badge&logo=leaf)
![Python](https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge&logo=python)
![React](https://img.shields.io/badge/React-19.1+-61DAFB?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.118+-009688?style=for-the-badge&logo=fastapi)

**AI-Powered Wildlife Camera Trap Analysis for Conservation Research**

*Automatically detect, classify, and organize thousands of camera trap images. Save time, protect wildlife, and combat poaching with intelligent image analysis.*

</div>

---

## Problem Statement

Wildlife researchers and conservationists face the monumental challenge of processing thousands of camera trap images manually. Traditional methods are:

- **Time-intensive**: Manual review of thousands of images takes weeks
- **Error-prone**: Human fatigue leads to missed detections and misclassifications  
- **Resource-heavy**: Requires large teams of trained personnel
- **Inefficient**: No systematic way to organize and analyze wildlife data

**TrapSense AI** revolutionizes this process by providing an intelligent, automated solution that processes camera trap images in real-time, delivering accurate wildlife detection and classification results instantly.

---

##  Our Solution

FaunaScope AI is a comprehensive platform that combines cutting-edge computer vision with modern web technologies to deliver:

### Core Capabilities
- **Smart Detection**: AI automatically identifies animals, humans, and vehicles in camera trap images
- **Instant Classification**: Segregate valid wildlife photos from empty frames and false triggers
- **Real-time Processing**: Process thousands of images in minutes, not days
- **Interactive Dashboard**: Visualize wildlife distribution patterns with heatmaps and statistics
- **Batch Processing**: Upload entire folders while preserving organizational structure
- **Export Capabilities**: Download filtered results and metadata for further analysis

### Key Features
- **Two-Stage ML Pipeline**: Classification (blank/non-blank) followed by object detection
- **Geographic Visualization**: Interactive heatmaps showing wildlife distribution patterns
- **User Authentication**: Secure access with Clerk authentication
- **Cloud Storage**: Scalable S3 integration for image storage
- **Real-time Updates**: Live processing status and prediction results

---

##  System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   ML Pipeline   │
│   (React)       │◄──►│   (FastAPI)     │◄──►│   (PyTorch)     │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • REST API      │    │ • YOLOv8        │
│ • Upload UI     │    │ • Auth (Clerk)  │    │ • Classification│
│ • Heatmaps      │    │ • Database      │    │ • Detection     │
│ • Statistics    │    │ • S3 Storage    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cloud Storage │    │   Database      │    │   Background    │
│   (AWS S3)      │    │   (SQLite)     │    │   Processing   │
│                 │    │                 │    │                 │
│ • Image Storage │    │ • User Data     │    │ • Async Tasks  │
│ • Presigned URLs│    │ • Media Records │    │ • ML Inference  │
│ • File Metadata │    │ • Predictions   │    │ • DB Updates   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **Upload**: Users upload images via React frontend
2. **Storage**: Images stored in AWS S3 with presigned URLs
3. **Database**: Media records created in SQLite database
4. **Processing**: Background tasks trigger ML pipeline
5. **Classification**: YOLOv8 model classifies images as blank/non-blank
6. **Detection**: Non-blank images processed through object detection
7. **Results**: Predictions stored in database and displayed in dashboard
8. **Visualization**: Heatmaps and statistics generated from processed data

---

## Technology Stack

### Frontend
- **React 19.1+** - Modern UI framework with hooks and context
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework for responsive design
- **Framer Motion** - Smooth animations and transitions
- **React Router** - Client-side routing
- **Leaflet** - Interactive maps for heatmap visualization
- **Clerk** - Authentication and user management
- **Axios** - HTTP client for API communication

### Backend
- **FastAPI** - High-performance Python web framework
- **SQLAlchemy** - Python SQL toolkit and ORM
- **SQLite** - Lightweight database for development
- **Pydantic** - Data validation using Python type annotations
- **Uvicorn** - ASGI server for FastAPI
- **Clerk Backend API** - Server-side authentication
- **Boto3** - AWS SDK for S3 integration

### Machine Learning
- **PyTorch** - Deep learning framework
- **Ultralytics YOLOv8** - State-of-the-art object detection
- **PIL (Pillow)** - Python Imaging Library
- **NumPy** - Numerical computing
- **Torchvision** - Computer vision utilities

### Infrastructure
- **AWS S3** - Cloud storage for images
- **Docker** - Containerization (optional)
- **Git** - Version control

---

## Project Structure

```
faunascope/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── common/      # Shared components
│   │   │   └── layout/      # Layout components
│   │   ├── pages/           # Page components
│   │   ├── auth/            # Authentication components
│   │   ├── css/             # Stylesheets
│   │   └── utils/           # Utility functions
│   ├── public/              # Static assets
│   └── package.json         # Dependencies
├── backend/                 # FastAPI backend
│   ├── src/
│   │   ├── api/             # API routes
│   │   ├── database/        # Database models and operations
│   │   ├── services/        # Business logic
│   │   │   ├── ml.py        # ML pipeline
│   │   │   ├── s3.py        # S3 operations
│   │   │   └── worker.py    # Background processing
│   │   ├── routes/          # API endpoints
│   │   └── utils/            # Utility functions
│   └── pyproject.toml       # Python dependencies
├── ml/                      # Machine learning models
│   ├── classifier/          # Classification model
│   └── detection/           # Object detection model
└── README.md               # This file
```

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- AWS S3 bucket (for production)
- Clerk account (for authentication)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd faunascope
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   # Or using uv (recommended)
   uv sync
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

4. **Environment Configuration**
   ```bash
   # Backend .env
   CLERK_SECRET_KEY=your_clerk_secret_key
   JWT_SECRET_KEY=your_jwt_secret
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_BUCKET_NAME=your_s3_bucket
   AWS_REGION=your_aws_region
   
   # Frontend .env
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   VITE_API_BASE_URL=http://localhost:8000/api
   ```

### Running the Application

1. **Start the Backend**
   ```bash
   cd backend
   uvicorn src.app:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Start the Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

---

## 🔧 API Endpoints

### Authentication
- `POST /api/users` - Create new user
- `GET /api/users/me` - Get current user

### Media Management
- `POST /api/media` - Upload single image
- `POST /api/media/batch` - Upload multiple images
- `GET /api/media` - Get user's media
- `GET /api/media/{id}` - Get specific media
- `GET /api/media/heatmap` - Get coordinates for heatmap

### Processing
- `GET /api/predictions/{id}` - Get ML predictions
- `POST /api/predictions/process/{id}` - Trigger processing

### Export
- `GET /api/media/export/csv` - Export as CSV
- `GET /api/media/export/zip` - Export as ZIP
- `GET /api/media/export/summary` - Get export statistics

---

##  Machine Learning Pipeline

### Two-Stage Processing

1. **Classification Stage**
   - Input: Raw camera trap image
   - Model: Custom YOLOv8 classification model
   - Output: "blank" or "non-blank" with confidence score
   - Purpose: Filter out empty frames and false triggers

2. **Detection Stage** (for non-blank images)
   - Input: Classified non-blank image
   - Model: YOLOv8 object detection model
   - Output: Bounding boxes, species identification, confidence scores
   - Purpose: Identify and classify wildlife species

### Model Architecture
- **Framework**: PyTorch with Ultralytics YOLOv8
- **Input Size**: 224x224 pixels (classification), variable (detection)
- **Preprocessing**: Image normalization, resizing, tensor conversion
- **Output**: JSON format with bounding boxes, classes, and confidence scores

---

## Dashboard Features

### Wildlife Heatmap
- Interactive map showing wildlife distribution patterns
- Geographic visualization of camera trap locations
- Heat intensity based on detection frequency
- Focused on Serengeti ecosystem for demonstration

### Statistics Dashboard
- **Animal Count**: Total detections by species
- **Non-blank Statistics**: Processing metrics and success rates
- **Export Capabilities**: Download filtered results and metadata
- **Real-time Updates**: Live processing status and results

### Upload Interface
- **Single File Upload**: Individual image processing
- **Batch Upload**: Multiple images with progress tracking
- **Folder Upload**: Preserve organizational structure
- **Preview System**: Full-screen image preview with predictions

---

##  Security & Authentication

- **Clerk Integration**: Secure user authentication and management
- **JWT Tokens**: Stateless authentication for API access
- **User Isolation**: Data segregation by authenticated users
- **Presigned URLs**: Secure S3 upload without exposing credentials
- **CORS Protection**: Cross-origin request security

---

##  Deployment

### Production Considerations
- **Database**: Migrate from SQLite to PostgreSQL for production
- **Storage**: AWS S3 for scalable image storage
- **Authentication**: Clerk for production-ready auth
- **Monitoring**: Add logging and error tracking
- **Scaling**: Consider containerization with Docker

### Environment Variables
```bash
# Production environment variables
DATABASE_URL=postgresql://user:pass@host:port/db
AWS_BUCKET_NAME=production-bucket
CLERK_SECRET_KEY=production_secret_key
```

---

## 🤝 Contributing

We welcome contributions to improve TrapSense AI! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

##  Acknowledgments

- **Ultralytics** for the YOLOv8 framework
- **Clerk** for authentication services
- **AWS** for cloud storage infrastructure
- **React** and **FastAPI** communities for excellent documentation
- **Wildlife Conservation** organizations for inspiration and use cases

---

<div align="center">

**Built with ❤️ for Wildlife Conservation**

*Empowering researchers to protect our planet's biodiversity through intelligent technology*

</div>
