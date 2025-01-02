declare namespace App {
  interface Locals {
    globalState: {
      elevation: number;
      latestHike: string;
      peakSleeps: number;
      waypoints: {
        total: number;
        sketch: number;
        surveying: number;
        charted: number;
      };
      writings: {
        total: number;
      };
    books: {
        total: number;
        completed: number;
        reading: number;
        highlights: number;
      };
      hikes: {
        total: number;
        distance: string;
        elevation: string;
        time: string;
      }
    };
  }
}
