import { exec, ExecException, ExecOptions } from "child_process";
import { contextBridge } from "electron";
import fs from "fs";
import path from "path";
import os from "os";

// Define a type for shutdown schedule entries
interface ShutdownSchedule {
  taskName: string;
  timestamp: number;
  delayInSeconds: number;
  scheduledTime: string;
  enabled: boolean;
  scheduleType: "once" | "daily" | "weekly";
  daysOfWeek?: string[];
  // Optional job ID for one-time scheduling with `at`
  jobId?: string;
}

type RunCommandError = { error: ExecException; stderr: string };
const execAsync = (
  command: string,
  options?: ExecOptions
): Promise<string | RunCommandError> => {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stderr });
      } else {
        resolve(stdout);
      }
    });
  });
};

// Paths and constants
// const shutdownSchedulesPath = path.join(
//   process.cwd(),
//   "shutdownSchedules.json"
// );
const shutdownSchedulesPath = path.join(__dirname, "shutdownSchedules.json");
const taskNamePrefix = "ElectronShutdownTask";
const isWindows = os.platform() === "win32";
const isMacOS = os.platform() === "darwin";
const isLinux = os.platform() === "linux";
const isUnix = !isMacOS && !isLinux && !isWindows;

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

// Helper function to format cron time strings for scheduling
const formatCronTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const minutes = date.getMinutes();
  const hours = date.getHours();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1;
  const dayOfWeek = date.getDay();
  return `${minutes} ${hours} ${dayOfMonth} ${month} ${dayOfWeek}`;
};

const enableCronTask = async (taskName: string) => {
  try {
    const stdout: string = await execAsync(`crontab -l`);
    // Enable cron job by uncommenting the line after the task name comment
    const updatedCron = stdout
      .split("\n")
      .map((line, index, lines) => {
        // Find the task name comment and uncomment the next line if it’s commented
        if (
          line.trim() === `# ${taskName}` &&
          lines[index + 1]?.startsWith("#")
        ) {
          lines[index + 1] = lines[index + 1].replace(/^#\s*/, ""); // Uncomment the cron line
        }
        return line;
      })
      .join("\n");

    try {
      await execAsync(`echo "${updatedCron}" | crontab -`);
      console.log(`Cron job ${taskName} enabled.`);
    } catch (error) {
      console.error(
        `Error enabling cron job for ${taskName}: ${error.message}`
      );
    }
  } catch (error) {
    console.error(`Error reading crontab: ${error.message}`);
    return;
  }
};

const disableCronTask = async (taskName: string) => {
  try {
    const stdout: string = await execAsync(`crontab -l`);
    // Disable cron job by commenting out the line after the task name comment
    const updatedCron = stdout
      .split("\n")
      .map((line, index, lines) => {
        // Find the task name comment and comment the next line if it’s uncommented
        if (
          line.trim() === `# ${taskName}` &&
          !lines[index + 1]?.startsWith("#")
        ) {
          lines[index + 1] = `# ${lines[index + 1]}`; // Comment out the cron line
        }
        return line;
      })
      .join("\n");

    try {
      await execAsync(`echo "${updatedCron}" | crontab -`);
      console.log(`Cron job ${taskName} disabled.`);
    } catch (error) {
      console.error(
        `Error disabling cron job for ${taskName}: ${error.message}`
      );
    }
  } catch (error) {
    console.error(`Error reading crontab: ${error.message}`);
    return;
  }
};

const deleteAtTask = async (jobId: string) => {
  try {
    await execAsync(`atrm ${jobId}`);
    console.log(`At job with ID ${jobId} disabled.`);
  } catch (error) {
    console.error(`Error disabling at job with ID ${jobId}: ${error.message}`);
  }
};

// Shutdown scheduling and management API
export const bridgeApi = {
  listShutdownSchedules: (): ShutdownSchedule[] => {
    console.log(loadSchedules());

    return loadSchedules().map((schedule) => ({
      ...schedule,
      scheduledTime: new Date(schedule.timestamp).toLocaleString(),
    }));
  },

  setShutdownTimerTask: async ({
    delayInSeconds,
    delayInMinutes = 0,
    delayInHours = 0,
    delayInDays = 0,
    action = "shutdown",
    scheduleType = "once",
    daysOfWeek = [],
    enabled = true,
    onSuccess,
  }: {
    delayInSeconds: number;
    delayInMinutes?: number;
    delayInHours?: number;
    delayInDays?: number;
    action: "shutdown" | "reboot";
    scheduleType: "once" | "daily" | "weekly";
    daysOfWeek?: string[];
    enabled?: boolean;
    onSuccess?: () => void;
  }) => {
    const delayInMilliseconds =
      (delayInSeconds > 0 && delayInSeconds <= 60 ? 61 : delayInSeconds) *
        1000 +
      (delayInMinutes === 1 ? delayInMinutes + 1 : delayInMinutes) * 60 * 1000 +
      delayInHours * 60 * 60 * 1000 +
      delayInDays * 24 * 60 * 60 * 1000;

    // Calculate the future timestamp based on the total delay
    const timestamp = Date.now() + delayInMilliseconds;
    const taskName = `${taskNamePrefix}_${timestamp}`;
    const scheduledTime = new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
    });

    if (!enabled) {
      console.log(`Task ${taskName} saved but not enabled.`);
      return;
    }

    if (isWindows) {
      // Windows scheduling with schtasks remains the same
      const command =
        action === "shutdown"
          ? `shutdown -s -f -t ${Math.floor(delayInMilliseconds / 1000)}`
          : `shutdown -r -f -t ${Math.floor(delayInMilliseconds / 1000)}`;

      let schtasksCommand = `schtasks /create /tn ${taskName} /tr "${command}" /st ${scheduledTime}`;
      if (scheduleType === "daily") {
        schtasksCommand += " /sc daily";
      } else if (scheduleType === "weekly" && daysOfWeek.length > 0) {
        schtasksCommand += ` /sc weekly /d ${daysOfWeek.join(",")}`;
      } else {
        schtasksCommand += " /sc once";
      }

      try {
        await execAsync(schtasksCommand);
        console.log(`${action} timer set for ${delayInSeconds} seconds`);
        const schedules = loadSchedules();
        schedules.push({
          taskName,
          timestamp,
          delayInSeconds,
          scheduledTime,
          enabled,
          scheduleType,
          daysOfWeek,
        });
        saveSchedules(schedules);

        if (onSuccess) {
          onSuccess();
        }
      } catch (error) {
        console.error(`Error setting ${action} timer: ${error.message}`);
      }
    } else if (isMacOS || isLinux || isUnix) {
      // const command = action === "shutdown" ? "poweroff" : "reboot";
      let command = "";
      if (isMacOS) {
        command =
          action === "shutdown"
            ? `/usr/bin/osascript -e 'tell application \\"System Events\\" to shut down'`
            : // ? "/sbin/shutdown -h now >> /Users/hichemfantar/github_projects/my-timer-app/cron_output.log"
              `/usr/bin/osascript -e 'tell application \\"System Events\\" to restart'`;
      } else {
        command = action === "shutdown" ? "poweroff" : "reboot";
        // action === "shutdown"
        // ? "/sbin/shutdown -h now"
        // : "/sbin/shutdown -r now";
      }

      if (scheduleType === "once") {
        // Use `at` command for one-time scheduling
        const atTime = new Date(timestamp).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        console.log(`echo "${command}" | at ${atTime}`);

        try {
          const stdout: string = await execAsync(
            `echo "${command}" | at ${atTime} 2>&1 | head -n 1 | grep -oE '[0-9]+'`
          );
          const jobId = stdout.split("\n")[0].trim(); // Extracts job ID (numeric part)

          console.log(`Job scheduled with ID: ${jobId}`);
          console.log(`${action} set for once at ${atTime}`);
          if (onSuccess) {
            const schedules = loadSchedules();
            schedules.push({
              taskName,
              timestamp,
              delayInSeconds,
              scheduledTime,
              enabled,
              scheduleType,
              daysOfWeek,
              jobId,
            });
            saveSchedules(schedules);

            onSuccess();
          }
        } catch (error) {
          console.error(
            `Error setting one-time ${action} with 'at' command: ${error.message}`
          );
        }
      } else {
        // Handle daily or weekly scheduling with cron
        const cronTime = formatCronTime(timestamp);

        let cronJob = `${cronTime} ${command}`;
        if (scheduleType === "daily") {
          cronJob = `0 ${new Date(timestamp).getHours()} * * * ${command}`;
        } else if (scheduleType === "weekly" && daysOfWeek.length > 0) {
          cronJob = `0 ${new Date(timestamp).getHours()} * * ${daysOfWeek
            .map((day) => day.slice(0, 3))
            .join(",")} ${command}`;
        }

        const cronEntry = `# ${taskName}\n${cronJob}`;

        try {
          await execAsync(`(crontab -l; echo "${cronEntry}") | crontab -`, {
            shell: "/bin/bash",
          });
          console.log(
            `${scheduleType} cron job set for ${delayInSeconds} seconds`
          );
          if (onSuccess) {
            const schedules = loadSchedules();
            schedules.push({
              taskName,
              timestamp,
              delayInSeconds,
              scheduledTime,
              enabled,
              scheduleType,
              daysOfWeek,
            });
            saveSchedules(schedules);

            onSuccess();
          }
        } catch (error) {
          console.error(
            `Error setting ${scheduleType} ${action} cron job: ${error.message}`
          );
        }
      }
    }
  },
  cancelShutdownTask: async (taskName: string, jobId?: string) => {
    const schedules = loadSchedules();
    const taskIndex = schedules.findIndex(
      (schedule) => schedule.taskName === taskName
    );

    if (taskIndex !== -1) {
      if (isWindows) {
        try {
          await execAsync(`schtasks /delete /tn ${taskName} /f`);
          schedules.splice(taskIndex, 1);
          saveSchedules(schedules);
          console.log(`Shutdown canceled successfully for task ${taskName}`);
        } catch (error) {
          console.error(
            `Error canceling shutdown for task ${taskName}: ${error.message}`
          );
        }
      } else {
        if (jobId) {
          await deleteAtTask(jobId);
          schedules.splice(taskIndex, 1);
          saveSchedules(schedules);
        } else {
          try {
            await execAsync(
              `crontab -l | sed '/# ${taskName}/,/^$/d' | crontab -`
            );
            schedules.splice(taskIndex, 1);
            saveSchedules(schedules);
            console.log(`Cron job canceled for ${taskName}`);
          } catch (error) {
            console.error(
              `Error removing cron job for ${taskName}: ${error.message}`
            );
          }
        }
      }
    } else {
      console.log(`No task found with name ${taskName}`);
    }
  },

  cancelAllShutdowns: async () => {
    const schedules = loadSchedules();
    if (isWindows) {
      for (const { taskName } of schedules) {
        try {
          await execAsync(`schtasks /delete /tn ${taskName} /f`);
          console.log(`Shutdown canceled for ${taskName}`);
        } catch (error) {
          console.error(
            `Error canceling shutdown for task ${taskName}: ${error.message}`
          );
        }
      }
    } else {
      try {
        const stdout: string = await execAsync(`crontab -l`);
        const updatedCron = stdout
          .split("\n")
          .filter((line) => !line.startsWith(`# ${taskNamePrefix}_`))
          .join("\n");

        try {
          await execAsync(`echo "${updatedCron}" | crontab -`);
          console.log("All shutdown-related cron jobs canceled.");
        } catch (error) {
          console.error(
            `Error updating crontab to remove shutdown tasks: ${error.message}`
          );
        }
      } catch (error) {
        console.error(`Error listing cron jobs: ${error.message}`);
        return;
      }
    }
    saveSchedules([]);
  },

  enableTask: async (taskName: string) => {
    const schedules = loadSchedules();
    const schedule = schedules.find((s) => s.taskName === taskName);

    if (!schedule) {
      console.log(`Task ${taskName} not found.`);
      return;
    }

    if (isWindows) {
      try {
        await execAsync(`schtasks /change /tn ${taskName} /enable`);
        schedule.enabled = true;
        saveSchedules(schedules);
        console.log(`Task ${taskName} enabled successfully.`);
      } catch (error) {
        console.error(`Error enabling task ${taskName}: ${error.message}`);
        return;
      }
    } else {
      enableCronTask(taskName);
      schedule.enabled = true;
      saveSchedules(schedules);
    }
  },

  disableTask: async (taskName: string) => {
    const schedules = loadSchedules();
    const schedule = schedules.find((s) => s.taskName === taskName);

    if (!schedule) {
      console.log(`Task ${taskName} not found.`);
      return;
    }

    if (isWindows) {
      try {
        await execAsync(`schtasks /change /tn ${taskName} /disable`);
        schedule.enabled = false;
        saveSchedules(schedules);
        console.log(`Task ${taskName} disabled successfully.`);
      } catch (error) {
        console.error(`Error disabling task ${taskName}: ${error.message}`);
        return;
      }
    } else {
      disableCronTask(taskName);

      schedule.enabled = false;
      saveSchedules(schedules);
    }
  },

  enableAll: () => {
    const schedules = loadSchedules();
    for (const schedule of schedules) {
      if (isWindows) {
        try {
          execAsync(`schtasks /change /tn ${schedule.taskName} /enable`);
        } catch (error) {
          console.error(
            `Error enabling task ${schedule.taskName}: ${error.message}`
          );
        }
      } else {
        enableCronTask(schedule.taskName);
      }
      schedule.enabled = true;
    }
    saveSchedules(schedules);
    console.log("All tasks enabled successfully.");
  },

  disableAll: async () => {
    const schedules = loadSchedules();
    for (const schedule of schedules) {
      if (isWindows) {
        try {
          await execAsync(`schtasks /change /tn ${schedule.taskName} /disable`);
        } catch (error) {
          console.error(
            `Error disabling task ${schedule.taskName}: ${error.message}`
          );
        }
      } else {
        disableCronTask(schedule.taskName);
      }
      schedule.enabled = false;
    }
    saveSchedules(schedules);
    console.log("All tasks disabled successfully.");
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld("bridge", bridgeApi);
