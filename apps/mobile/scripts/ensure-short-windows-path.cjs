const cwd = process.cwd().toUpperCase();

if (process.platform === 'win32' && !cwd.startsWith('X:\\')) {
  console.error(
    'Run this from X:\\apps\\mobile after: subst X: C:\\Users\\user\\Desktop\\hackfusion_huntrix',
  );
  process.exit(1);
}
