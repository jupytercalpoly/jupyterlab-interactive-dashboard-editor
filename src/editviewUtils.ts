export function openfullscreen(node: HTMLElement) {
  // Trigger fullscreen
  const docElmWithBrowsersFullScreenFunctions = node as HTMLElement & {
    mozRequestFullScreen(): Promise<void>;
    webkitRequestFullscreen(): Promise<void>;
    msRequestFullscreen(): Promise<void>;
  };

  console.log(node);
  if (docElmWithBrowsersFullScreenFunctions.requestFullscreen) {
    // console.log("one");
    docElmWithBrowsersFullScreenFunctions.requestFullscreen();
  } else if (docElmWithBrowsersFullScreenFunctions.mozRequestFullScreen) {
    /* Firefox */
    // console.log("two");
    docElmWithBrowsersFullScreenFunctions.mozRequestFullScreen();
  } else if (docElmWithBrowsersFullScreenFunctions.webkitRequestFullscreen) {
    /* Chrome, Safari and Opera */
    // console.log("three");
    docElmWithBrowsersFullScreenFunctions.webkitRequestFullscreen();
  } else if (docElmWithBrowsersFullScreenFunctions.msRequestFullscreen) {
    /* IE/Edge */
    // console.log("four");
    docElmWithBrowsersFullScreenFunctions.msRequestFullscreen();
  }
  // console.log("five");
  // this.isfullscreen = true;
}

//   export function closefullscreen(){
//     const docWithBrowsersExitFunctions = document as Document & {
//       mozCancelFullScreen(): Promise<void>;
//       webkitExitFullscreen(): Promise<void>;
//       msExitFullscreen(): Promise<void>;
//     };
//     if (docWithBrowsersExitFunctions.exitFullscreen) {
//       docWithBrowsersExitFunctions.exitFullscreen();
//     } else if (docWithBrowsersExitFunctions.mozCancelFullScreen) { /* Firefox */
//       docWithBrowsersExitFunctions.mozCancelFullScreen();
//     } else if (docWithBrowsersExitFunctions.webkitExitFullscreen) { /* Chrome, Safari and Opera */
//       docWithBrowsersExitFunctions.webkitExitFullscreen();
//     } else if (docWithBrowsersExitFunctions.msExitFullscreen) { /* IE/Edge */
//       docWithBrowsersExitFunctions.msExitFullscreen();
//     }
//     // this.isfullscreen = false;
// }
