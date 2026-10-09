export type RunTestLevel = 'RunSpecifiedTests' | 'RunLocalTests' | 'RunAllTestsInOrg';

export type TestsNode =
  | {
      classId: string;
      testMethods?: string[];
    }
  | {
      className: string;
      testMethods?: string[];
    };

export type RunTestsRequest = {
  tests: TestsNode[];
  maxFailedTests?: number;
  testLevel?: RunTestLevel;
  skipCodeCoverage?: boolean;
};

export type CodeCoverageResult = {
  id: string;
  locationsNotCovered: string[];
  name: string;
  namespace: string | null;
  numLocations: number;
  numLocationsNotCovered: number;
  type: string;
};
export type CodeCoverageWarning = {
  id: string;
  message: string;
  name: string | null;
  namespace: string | null;
};
export type FlowCoverageResult = {
  elementsNotCovered: string[];
  flowId: string;
  flowName: string;
  flowNamespace: string | null;
  numElements: number;
  numElementsNotCovered: number;
  processType: string;
};
export type FlowCoverageWarning = {
  flowId: string;
  flowName: string;
  flowNamespace: string | null;
  message: string;
};
export type RunTestSuccess = {
  id: string;
  methodName: string;
  name: string;
  namespace: string | null;
  seeAllData: boolean;
  time: number;
};
export type RunTestFailure = {
  id: string;
  message: string;
  methodName: string;
  name: string;
  namespace: string | null;
  seeAllData: boolean;
  stackTrace: string;
  time: number;
  type: string;
};

export type RunTestsResult = {
  apexLogId: string;
  codeCoverage: CodeCoverageResult[];
  codeCoverageWarnings: CodeCoverageWarning[];
  flowCoverage: FlowCoverageResult[];
  flowCoverageWarnings: FlowCoverageWarning[];
  numFailures: number;
  numTestsRun: number;
  successes: RunTestSuccess[];
  failures: RunTestFailure[];
  totalTime: number;
};

export type Error = {
  code?: string | undefined;
  exit: false;
  errorCode: string;
  data: object;
};