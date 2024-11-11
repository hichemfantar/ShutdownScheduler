WINDOWS handles date formats in commands according to thee user

import { contextBridge } from "electron";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

// Define a type for shutdown schedule entries
interface ShutdownSchedule {
  taskName: string;
  timestamp: number;
  delayInSeconds: number;
}

// Paths and constants
const shutdownSchedulesPath = path.join(__dirname, "shutdownSchedules.json");
// const shutdownSchedulesPath = path.join(
//   "C:\\Users\\HichemFantar\\Desktop",
//   "shutdownSchedules.json"
// );
const taskNamePrefix = "ElectronShutdownTask";
console.log(shutdownSchedulesPath);

// Helper function to load schedules from a JSON file
const loadSchedules = (): ShutdownSchedule[] => {
  if (fs.existsSync(shutdownSchedulesPath)) {
    const data = fs.readFileSync(shutdownSchedulesPath, "utf-8");
    return JSON.parse(data) as ShutdownSchedule[];
  }
  return [];
};

// Helper function to save schedules to a JSON file
const saveSchedules = (schedules: ShutdownSchedule[]): void => {
  fs.writeFileSync(shutdownSchedulesPath, JSON.stringify(schedules, null, 2));
};

export const bridgeApi = {
  getNodeVer: (): string => process.versions.node,
  getChromeVer: (): string => process.versions.chrome,
  getElectronVer: (): string => process.versions.electron,

  // Method 1: Set shutdown timer using the shutdown command
  setShutdownTimerCommand: (delayInSeconds: number) => {
    const command = `shutdown -s -t ${delayInSeconds}`;
    exec(command,{
      shell: "cmd"
    }, (error) => {
      if (error) {
        console.error(
          `Error setting shutdown timer with command: ${error.message}`
        );
      } else {
        console.log(
          `Shutdown timer set for ${delayInSeconds} seconds via shutdown command`
        );
      }
    });
  },

  // Method 2: Set shutdown timer using Task Scheduler with a specified date
  setShutdownTimerTask: (
    delayInSeconds: number,
    targetDate: Date,
    callback: () => void
  ) => {
    const taskName = `${taskNamePrefix}_${targetDate.getTime()}`;

    // Format the date and time for schtasks
    const scheduledDate = targetDate
      .toLocaleDateString("en-US")
      .replace(/\//g, "-");
    const scheduledTime = targetDate.toLocaleTimeString("en-US", {
      hour12: false,
    });

    const command = `schtasks /create /tn ${taskName} /tr "shutdown -s -f" /sc once /sd ${scheduledDate} /st ${scheduledTime}`;

    exec(command, (error) => {
      if (error) {
        console.error(
          `Error setting shutdown timer with Task Scheduler: ${error.message}`
        );
      } else {
        const schedules = loadSchedules();
        schedules.push({
          taskName,
          timestamp: targetDate.getTime(),
          delayInSeconds,
        });
        saveSchedules(schedules);
        console.log(
          `Shutdown timer set for ${targetDate.toLocaleString()} via Task Scheduler`
        );
        callback();
      }
    });
  },

  // Cancel all shutdown timers (both methods)
  cancelShutdown: () => {
    // Cancel shutdown set with shutdown command
    const commandCancelShutdown = "shutdown -a";
    exec(commandCancelShutdown, (error) => {
      if (error) {
        console.error(
          `Error canceling shutdown with shutdown command: ${error.message}`
        );
      } else {
        console.log("Shutdown canceled successfully for shutdown command");
      }
    });

    // Cancel shutdowns set with Task Scheduler
    const schedules = loadSchedules();
    schedules.forEach(({ taskName }) => {
      const command = `schtasks /delete /tn ${taskName} /f`;
      exec(command, (error) => {
        if (error) {
          console.error(
            `Error canceling shutdown for task ${taskName}: ${error.message}`
          );
        } else {
          console.log(`Shutdown canceled successfully for task ${taskName}`);
        }
      });
    });

    // Clear all scheduled shutdowns from the file
    saveSchedules([]);
  },

  // Function to list all scheduled shutdowns set with Task Scheduler
  listShutdownSchedules: () => {
    const schedules = loadSchedules();
    return schedules.map(({ taskName, timestamp, delayInSeconds }) => ({
      taskName,
      timestamp,
      delayInSeconds,
      scheduledTime: new Date(timestamp).toLocaleString(),
    }));
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld("bridge", bridgeApi);
