import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
// import { MakerDMG } from "@electron-forge/maker-dmg";
// import { MakerRpm } from "@electron-forge/maker-rpm";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import { exec } from "child_process";
import path from "path";
import os from "os";
import { PublisherGitHubConfig } from "@electron-forge/publisher-github";

const config: ForgeConfig = {
  packagerConfig: {
    asar: false,
    // name: "shutdown-scheduler",
    // this must be used because it breaks on ubuntu
    executableName:
      os.platform() === "linux" ? "shutdown-scheduler" : undefined,
    // osxSign: {},
    icon: path.join(process.cwd(), "public", "assets", "icon"), // no file extension required
    // icon: "/icon.icns", // no file extension required
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ["darwin"]),
    // new MakerRpm({}),
    new MakerDeb({}),
    // new MakerDMG(),
  ],
  hooks: {
    // generateAssets: async (forgeConfig, resources) => {
    //   console.log("generateAssets hook");
    //   console.log(forgeConfig);
    //   console.log(resources);
    // },
    postPackage: async (forgeConfig, options) => {
      console.info("Packages built at:", options.outputPaths);
      const appPath = path.join(
        options.outputPaths[0],
        "Shutdown Scheduler.app"
      );

      // due to a bug with forgeConfig, i have to resign the app manually
      // https://github.com/electron/forge/issues/3754

      // Function to run a shell command
      const runCommand = (command: string) => {
        return new Promise((resolve, reject) => {
          exec(command, (error, stdout, stderr) => {
            if (error) {
              reject({ error, stderr });
            } else {
              resolve(stdout);
            }
          });
        });
      };

      try {
        // Run the codesign verification command
        await runCommand(
          `codesign --verify --deep --strict --verbose=2 "${appPath}"`
        );
        console.info("Codesign verification succeeded.");
      } catch (verificationError) {
        console.error(
          "Codesign verification failed:",
          verificationError.stderr
        );

        // Attempt to re-sign the application if verification fails
        try {
          console.info("Attempting to re-sign the application...");
          await runCommand(`codesign --force --deep --sign - "${appPath}"`);
          console.info("Re-signing succeeded.");

          // Re-run the verification after re-signing
          await runCommand(
            `codesign --verify --deep --strict --verbose=2 "${appPath}"`
          );
          console.info("Re-verification succeeded after re-signing.");
        } catch (signingError) {
          console.error("Re-signing failed:", signingError.stderr);
          throw new Error("Re-signing failed.");
        }
      }
    },
  },
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "hichemfantar",
          name: "shutdown-scheduler",
        },
        prerelease: true,
        draft: true,
      } as PublisherGitHubConfig,
    },
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: "src/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
};

export default config;
