// Mock window object for PGLite in Node environment
if (typeof window === 'undefined') {
  (global as any).window = {
    location: {
      pathname: '/',
      href: 'http://localhost',
      origin: 'http://localhost',
      hostname: 'localhost',
      protocol: 'http:',
      search: '',
      hash: '',
    },
    encodeURIComponent: (str: string) => encodeURIComponent(str),
    decodeURIComponent: (str: string) => decodeURIComponent(str),
    encodeURI: (str: string) => encodeURI(str),
    decodeURI: (str: string) => decodeURI(str),
    btoa: (str: string) => Buffer.from(str).toString('base64'),
    atob: (str: string) => Buffer.from(str, 'base64').toString(),
  };
}
