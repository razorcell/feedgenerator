declare global {
  namespace NodeJS {
    interface Global {
      document: Document
      window: Window
      navigator: Navigator
      gfinalConfig: Record<string, sourceConfig>
      gEurNxtEqDb: any
    }
  }
}

// declare const gfinalConfig: Record<string, sourceConfig>
