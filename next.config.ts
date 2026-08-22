import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingExcludes: {
    "/*": ["./DataBase/Football/**/*", "./DataBase/FormulaOne/archive/**/*", "./DataBase/FormulaOne/src/**/*"],
  },
  outputFileTracingIncludes: {
    "/*": ["./DataBase/index.json", "./DataBase/sources/**/*"],
    "/api/f1-intelligence": [
      "./DataBase/PredictionSystem/f1_predictor.py",
      "./DataBase/FormulaOne/driver_race_summary.csv",
      "./DataBase/FormulaOne/compound_performance.csv",
      "./DataBase/FormulaOne/drivers.csv",
      "./DataBase/FormulaOne/pit_strategy.csv",
      "./DataBase/FormulaOne/pit_stops.csv",
      "./DataBase/FormulaOne/stint_analysis.csv",
    ],
    "/api/f1-predict": [
      "./DataBase/PredictionSystem/f1_predictor.py",
      "./DataBase/FormulaOne/driver_race_summary.csv",
      "./DataBase/FormulaOne/compound_performance.csv",
      "./DataBase/FormulaOne/drivers.csv",
      "./DataBase/FormulaOne/pit_strategy.csv",
      "./DataBase/FormulaOne/pit_stops.csv",
      "./DataBase/FormulaOne/stint_analysis.csv",
    ],
  },
  webpack(config) {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/DataBase/**"],
    };
    return config;
  },
};

export default nextConfig;
