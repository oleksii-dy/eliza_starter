// Export all test suites for the robot plugin
export { default as VisionBasicE2ETestSuite } from './tests/e2e/vision-basic';
export { default as VisionAutonomyE2ETestSuite } from './tests/e2e/vision-autonomy';
export { default as VisionCaptureLogTestSuite } from './tests/e2e/vision-capture-log';
export { default as ScreenVisionE2ETestSuite } from './tests/e2e/screen-vision';
export { default as VisionRuntimeTestSuite } from './tests/e2e/vision-runtime';
export { default as RobotControlTestSuite } from './tests/e2e/robot-control';
export { testSuites, default } from './tests/e2e/index';
