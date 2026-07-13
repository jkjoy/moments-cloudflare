declare module "@fancyapps/ui/dist/index.esm.js" {
  export const Fancybox: {
    bind: (...args: any[]) => void;
    unbind: (...args: any[]) => void;
    close: () => void;
    destroy?: () => void;
  };
}
