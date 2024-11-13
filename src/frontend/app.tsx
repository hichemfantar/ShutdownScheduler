import { Button } from "@/components/ui/button";
import React, { useEffect, useState } from "react";
import { useUpdate } from "react-use";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ModeToggle } from "@/components/theme/mode-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BanIcon, ListPlus, PlusIcon, Trash2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

// check psshutdown for sleep mode `psshutdown -d -t 0` https://superuser.com/a/395497

export function App() {
  const update = useUpdate();

  const [selectedAction, setSelectedAction] = useState<"shutdown" | "reboot">(
    "shutdown"
  );

  const [frequency, setFrequency] = useState<"once" | "daily" | "weekly">(
    "once"
  );

  const [days, setDays] = useState([
    { day: "Mon", selected: false },
    { day: "Tue", selected: false },
    { day: "Wed", selected: false },
    { day: "Thu", selected: false },
    { day: "Fri", selected: false },
    { day: "Sat", selected: false },
    { day: "Sun", selected: false },
  ]);

  const [scheduleInSeconds, setScheduleInSeconds] = useState(0);

  const [scheduleInMinutes, setScheduleInMinutes] = useState(1);
  const [scheduleInHours, setScheduleInHours] = useState(0);
  const [scheduleInDays, setScheduleInDays] = useState(0);

  const handleDaySelect = (day: string) => {
    setDays((prev) =>
      prev.map((d) => (d.day === day ? { ...d, selected: !d.selected } : d))
    );
  };

  const selectedDays = days.filter((d) => d.selected).map((d) => d.day);

  return (
    <>
      {/* use this for center */}
      {/* <div className="min-h-dvh flex items-center mx-auto  container xflex justify-center xitems-center h-full xpy-8 px-4 md:px-20"> */}
      <div className=" mx-auto  container xflex justify-center xitems-center h-full py-8 px-4 md:px-20">
        <div>
          <div className="flex items-center justify-between flex-wrap gap-1 mb-8">
            <div>
              <h1 className="text-3xl font-bold">Schedule a task</h1>
            </div>
            <ModeToggle />
          </div>
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="action">Action</Label>
                  <Select
                    onValueChange={(v) => {
                      const action = v as typeof selectedAction;
                      setSelectedAction(action);
                    }}
                    value={selectedAction}
                  >
                    <SelectTrigger className="xw-[180px]" id="action">
                      <SelectValue placeholder="Select an action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Action</SelectLabel>
                        <SelectItem value="shutdown">Shutdown</SelectItem>
                        <SelectItem value="reboot">Restart</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    onValueChange={(v) => {
                      const freq = v as typeof frequency;
                      setFrequency(freq);
                    }}
                    value={frequency}
                  >
                    <SelectTrigger className="xw-[180px]" id="frequency">
                      <SelectValue placeholder="Select a frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Frequency</SelectLabel>
                        <SelectItem value="once">Once</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {frequency === "weekly" && (
                <div>
                  <div className="text-xl font-bold mb-4">Days of the Week</div>
                  <div className="flex flex-wrap gap-4 backdrop-blur rounded items-center">
                    {/* <div className="bg-white/5 flex flex-wrap gap-4 p-4 backdrop-blur rounded"> */}
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="Monday"
                        checked={days.find((d) => d.day === "Mon")?.selected}
                        onCheckedChange={() => handleDaySelect("Mon")}
                      />
                      <Label htmlFor="Monday">Monday</Label>
                    </div>
                    <div className="h-9 bg-gray-50/20 w-[1px]"></div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="Tuesday"
                        checked={days.find((d) => d.day === "Tue")?.selected}
                        onCheckedChange={() => handleDaySelect("Tue")}
                      />
                      <Label htmlFor="Tuesday">Tuesday</Label>
                    </div>
                    <div className="h-9 bg-gray-50/20 w-[1px]"></div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="Wednesday"
                        checked={days.find((d) => d.day === "Wed")?.selected}
                        onCheckedChange={() => handleDaySelect("Wed")}
                      />
                      <Label htmlFor="Wednesday">Wednesday</Label>
                    </div>
                    <div className="h-9 bg-gray-50/20 w-[1px]"></div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="Thursday"
                        checked={days.find((d) => d.day === "Thu")?.selected}
                        onCheckedChange={() => handleDaySelect("Thu")}
                      />
                      <Label htmlFor="Thursday">Thursday</Label>
                    </div>
                    <div className="h-9 bg-gray-50/20 w-[1px]"></div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="Friday"
                        checked={days.find((d) => d.day === "Fri")?.selected}
                        onCheckedChange={() => handleDaySelect("Fri")}
                      />
                      <Label htmlFor="Friday">Friday</Label>
                    </div>
                    <div className="h-9 bg-gray-50/20 w-[1px]"></div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="Saturday"
                        checked={days.find((d) => d.day === "Sat")?.selected}
                        onCheckedChange={() => handleDaySelect("Sat")}
                      />
                      <Label htmlFor="Saturday">Saturday</Label>
                    </div>
                    <div className="h-9 bg-gray-50/20 w-[1px]"></div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="Sunday"
                        checked={days.find((d) => d.day === "Sun")?.selected}
                        onCheckedChange={() => handleDaySelect("Sun")}
                      />
                      <Label htmlFor="Sunday">Sunday</Label>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="text-xl font-bold mb-4">Delay</div>
                <div className="flex gap-4 items-center">
                  {/* <div className="grid w-full items-center gap-2">
                <Label htmlFor="delay">Delay (seconds)</Label>
                <Input
                  type="number"
                  min={0}
                  id="delay"
                  placeholder="Specify a delay in seconds"
                  value={scheduleInSeconds}
                  onChange={(e) => setScheduleInSeconds(Number(e.target.value))}
                />
              </div> */}
                  <div className="grid w-full items-center gap-2">
                    <Label htmlFor="delay_minutes">Minutes</Label>
                    <Input
                      min={0}
                      type="number"
                      id="delay_minutes"
                      placeholder="Specify a delay in minutes"
                      value={scheduleInMinutes}
                      onChange={(e) =>
                        setScheduleInMinutes(Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="grid w-full items-center gap-2">
                    <Label htmlFor="delay_hours">Hours</Label>
                    <Input
                      min={0}
                      type="number"
                      id="delay_hours"
                      placeholder="Specify a delay in hours"
                      value={scheduleInHours}
                      onChange={(e) =>
                        setScheduleInHours(Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="grid w-full items-center gap-2">
                    <Label htmlFor="delay_days">Days</Label>
                    <Input
                      min={0}
                      type="number"
                      id="delay_days"
                      placeholder="Specify a delay in days"
                      value={scheduleInDays}
                      onChange={(e) =>
                        setScheduleInDays(Number(e.target.value))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="justify-end flex gap-2">
              <Button
                onClick={() => {
                  window.bridge.setShutdownTimerTask({
                    action: selectedAction,
                    delayInSeconds: scheduleInSeconds,
                    scheduleType: frequency,
                    daysOfWeek: selectedDays,
                    delayInMinutes: scheduleInMinutes,
                    delayInHours: scheduleInHours,
                    delayInDays: scheduleInDays,
                    onSucess: () => {
                      update();
                    },
                  });
                }}
              >
                <PlusIcon />
                Create
              </Button>
            </div>
          </div>

          <Card className="mt-8 bg-gray-600/20 xborder-none">
            <CardHeader>
              <div className={cn("flex items-center justify-between")}>
                <div className={cn("flex flex-col space-y-1.5")}>
                  <CardTitle>Schedule</CardTitle>
                  <CardDescription>Manage your schedule here.</CardDescription>
                </div>
                <div className="justify-end flex gap-2">
                  <Button
                    onClick={() => {
                      window.bridge.cancelAllShutdowns();
                      update();
                    }}
                    variant="destructive"
                  >
                    <Trash2Icon />
                    Delete All
                  </Button>
                  <Button
                    onClick={() => {
                      window.bridge.disableAll();
                      update();
                    }}
                    variant="secondary"
                  >
                    <BanIcon />
                    Disable All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6">
              {window.bridge.listShutdownSchedules().length === 0 && (
                <div className="flex items-center justify-center">
                  <span className="text-muted-foreground">
                    No scheduled tasks found.
                  </span>
                </div>
              )}
              {window.bridge
                .listShutdownSchedules()
                .slice()
                .reverse()
                .map(({ timestamp, delayInSeconds, taskName, enabled }) => (
                  <div
                    key={timestamp}
                    className="flex items-center justify-between space-x-2"
                  >
                    <Label
                      htmlFor={taskName}
                      className="flex flex-col space-y-1"
                    >
                      <span>
                        Shutdown scheduled at{" "}
                        {new Date(timestamp).toLocaleString()}
                      </span>
                      <span className="font-normal leading-snug text-muted-foreground">
                        Delay in seconds: {delayInSeconds}
                      </span>
                    </Label>
                    <div className="flex items-center gap-4">
                      <Switch
                        id="necessary"
                        checked={enabled}
                        onCheckedChange={() => {
                          if (!enabled) {
                            window.bridge.enableTask(taskName);
                          } else window.bridge.disableTask(taskName);
                          update();
                        }}
                      />
                      <Button
                        onClick={() => {
                          window.bridge.cancelShutdownTask(taskName);
                          update();
                        }}
                        size="icon"
                        variant="ghost"
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </div>
                ))}
            </CardContent>
            {/* <CardFooter>
              <Button variant="outline" className="w-full">
                Save preferences
              </Button>
            </CardFooter> */}
          </Card>
        </div>
      </div>
      <div
        id="ddrag"
        style={{
          WebkitAppRegion: "drag",
        }}
        className="fixed top-0 h-6 w-full"
      ></div>
    </>
  );
}
