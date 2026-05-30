// Singleton wrapper for VS Code API
declare function acquireVsCodeApi(): any;

class VSCodeAPIWrapper {
  private readonly vsCodeApi: any;
  private static instance: VSCodeAPIWrapper;

  private constructor() {
    if (typeof acquireVsCodeApi === 'function') {
      this.vsCodeApi = acquireVsCodeApi();
    } else {
      // Mock for development in browser
      this.vsCodeApi = {
        postMessage: (msg: any) => console.log('Mock postMessage:', msg),
        setState: (state: any) => console.log('Mock setState:', state),
        getState: () => null
      };
    }
  }

  public static getInstance(): VSCodeAPIWrapper {
    if (!VSCodeAPIWrapper.instance) {
      VSCodeAPIWrapper.instance = new VSCodeAPIWrapper();
    }
    return VSCodeAPIWrapper.instance;
  }

  public postMessage(message: any): void {
    this.vsCodeApi.postMessage(message);
  }

  public setState(state: any): void {
    this.vsCodeApi.setState(state);
  }

  public getState(): any {
    return this.vsCodeApi.getState();
  }
}

export const vscodeApi = VSCodeAPIWrapper.getInstance();
