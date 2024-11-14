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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// check psshutdown for sleep mode `psshutdown -d -t 0` https://superuser.com/a/395497

export function App() {
  const update = useUpdate();
  const { toast } = useToast();

  const [selectedAction, setSelectedAction] = useState<"shutdown" | "reboot">(
    "shutdown"
  );

  const [frequency, setFrequency] = useState<"once" | "daily" | "weekly">(
    "once"
  );

  const [days, setDays] = useState([
    { day: "Mon", selected: true },
    { day: "Tue", selected: false },
    { day: "Wed", selected: false },
    { day: "Thu", selected: false },
    { day: "Fri", selected: false },
    { day: "Sat", selected: false },
    { day: "Sun", selected: false },
  ]);

  const [scheduleInMinutes, setScheduleInMinutes] = useState(1);
  const [scheduleInHours, setScheduleInHours] = useState(0);
  const [scheduleInDays, setScheduleInDays] = useState(0);

  const handleDaySelect = (day: string) => {
    if (selectedDays.length === 1 && selectedDays.includes(day)) {
      toast({
        title: "Error",
        description: "At least one day must be selected.",
      });

      return;
    }
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
                        // disabled
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
                  window.bridge.createTask({
                    action: selectedAction,
                    scheduleType: frequency,
                    daysOfWeek: selectedDays,
                    delayInMinutes: scheduleInMinutes,
                    delayInHours: scheduleInHours,
                    delayInDays: scheduleInDays,
                    onSuccess: () => {
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
                      window.bridge.deleteAllTasks();
                      update();
                    }}
                    variant="destructive"
                  >
                    <Trash2Icon />
                    Delete All
                  </Button>
                  {/* <Button
                    onClick={() => {
                      window.bridge.disableAllTasks();
                      update();
                    }}
                    variant="secondary"
                  >
                    <BanIcon />
                    Disable All
                  </Button> */}
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
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
                .map(
                  ({
                    action,
                    timestamp,
                    delayInSeconds,
                    taskName,
                    enabled,
                    jobId,
                    daysOfWeek,
                    scheduleType,
                  }) => (
                    <React.Fragment key={timestamp}>
                      <div className="flex items-center justify-between gap-x-2">
                        <div className="flex flex-col gap-2">
                          <span>
                            {
                              {
                                shutdown: "Shutdown",
                                reboot: "Restart",
                              }[action]
                            }{" "}
                            scheduled{" "}
                            <Badge variant="outline">{scheduleType}</Badge> at{" "}
                            {new Date(timestamp).toLocaleString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                          <div className="flex items-center gap-2">
                            {/* <span className="font-normal leading-snug text-muted-foreground">
                              Delay in seconds: {delayInSeconds}
                            </span> */}
                            {scheduleType === "weekly" &&
                              daysOfWeek.length > 0 && (
                                <div className="flex gap-2">
                                  {daysOfWeek.map((day) => (
                                    <Badge variant="default">{day}</Badge>
                                  ))}
                                </div>
                              )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Switch
                            id={taskName}
                            checked={enabled}
                            onCheckedChange={() => {
                              if (!enabled) {
                                window.bridge.enableTask(taskName);
                              } else {
                                window.bridge.disableTask(taskName);
                              }
                              update();
                            }}
                          />
                          <Button
                            onClick={async () => {
                              await window.bridge.deleteTask(taskName, jobId);
                              update();
                            }}
                            size="icon"
                            variant="ghost"
                          >
                            <Trash2Icon />
                          </Button>
                        </div>
                      </div>
                      <div className="border-b last:border-b-0 last:hidden"></div>
                    </React.Fragment>
                  )
                )}
            </CardContent>
            {/* <CardFooter>
              <Button variant="outline" className="w-full">
                Save preferences
              </Button>
            </CardFooter> */}
          </Card>
        </div>
      </div>
      {/* <div
        // style={{
        //   WebkitAppRegion: "drag",
        // }}
        className="fixed top-0 h-6 w-full app-region-drag"
      ></div> */}
    </>
  );
}
