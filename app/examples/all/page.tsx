"use client";

import React, { useState } from "react";
import styles from "./page.module.css";
import Chat from "../../components/chat";
import WeatherWidget from "../../components/weather-widget";
import { getWeather } from "../../utils/weather";
import { save_to_google_sheet } from "../../utils/google_sheet_api";
import FileViewer from "../../components/file-viewer";

const FunctionCalling = () => {
  const [weatherData, setWeatherData] = useState({});

  const functionCallHandler = async (call) => {
    if (call?.function?.name === "get_weather") {
      const args = JSON.parse(call.function.arguments);
      const data = getWeather(args.location);
      setWeatherData(data);
      return JSON.stringify(data);
    } else if (call?.function?.name === "save_to_google_sheet") {
      const args = JSON.parse(call.function.arguments);
      const result = await save_to_google_sheet({
        name: args.name,
        email: args.email,
        phone_number: args.phone_number,
        age: args.age,
        plan_summary: args.plan_summary,
      });
      return JSON.stringify(result);
    }
    return JSON.stringify({ error: "Tool not found" });
  };

  // return (
  //   <main className={styles.main}>
  //     <div className={styles.container}>
  //       <div className={styles.fileViewer}>
  //         <FileViewer />
  //       </div>
  //       <div className={styles.chatContainer}>
  //         <div className={styles.weatherWidget}>
  //           <div className={styles.weatherContainer}>
  //             <WeatherWidget {...weatherData} />
  //           </div>
  //         </div>
  //         <div className={styles.chat}>
  //           <Chat functionCallHandler={functionCallHandler} />
  //         </div>
  //       </div>
  //     </div>
  //   </main>
  // );

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.column}>
          <WeatherWidget {...weatherData} />
          <FileViewer />
        </div>
        <div className={styles.chatContainer}>
          <div className={styles.chat}>
            <Chat functionCallHandler={functionCallHandler} />
          </div>
        </div>
      </div>
    </main>
  );
};

export default FunctionCalling;
