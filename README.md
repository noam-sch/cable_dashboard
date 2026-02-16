# Submarine Cable Explorer

A modern, interactive dashboard for analyzing global submarine cable infrastructure. This application visualizes data regarding cable lengths, ownership (Hyperscalers vs. Telcos), geopolitical suppliers, and construction timelines.

## 🚀 Features

- **Network Overview**: Track total network length, active systems, and top hubs
- **Time Analysis**: Visualize the "Ready for Service" (RFS) timeline of global infrastructure
- **Geopolitical Insights**: Analyze "Technological Sovereignty" by supplier origin (USA, Europe, Japan, China)
- **Hyperscaler Shift**: Track the market share evolution between Big Tech (Google, Meta, etc.) and traditional telecom operators
- **Data Browser**: A searchable, sortable database of individual cable systems

## 🛠️ Built With

- **React** - UI Framework
- **Vite** - Build Tool
- **Tailwind CSS** - Styling
- **Recharts** - Data Visualization
- **Lucide React** - Icons

## ⚙️ Installation & Setup

### Clone the repository

```bash
git clone https://github.com/yourusername/cable-dashboard.git
cd cable-dashboard
```

### Install Dependencies

```bash
npm install
```

### Add Data File (Crucial Step)

This dashboard requires the master dataset to function.

Place your `submarine_cables_complete.json` file inside the `src/` directory.

**Note**: This file is not included in the repo by default to protect data rights.

### Configure Data Import

Open `src/App.jsx`.

Uncomment the import line at the top:

```javascript
import cableData from './submarine_cables_complete.json';
```

Remove or comment out the sample data block.

### Run Locally

```bash
npm run dev
```

## 📦 Deployment

This project is optimized for deployment on Netlify or Vercel.

1. Push your code to GitHub
2. Connect your repository to Netlify/Vercel
3. The build command `npm run build` will be detected automatically

## 📊 Data Credits

Data provided by TeleGeography. This application is for educational and analytical purposes.

## 📝 License

The source code for this project is distributed under the MIT License. See `LICENSE` for more information.

**Note regarding data**: The cable dataset is sourced from TeleGeography. This data is likely subject to its own copyright and usage terms. It is not covered by this project's MIT license.

***

Your README is now formatted in standard Markdown with proper hierarchy, code blocks, and structure. Would you like me to add additional sections like a contributing guide or troubleshooting tips?