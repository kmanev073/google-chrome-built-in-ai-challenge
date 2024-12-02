import { createSignal } from 'solid-js';
// import solidLogo from '@/assets/solid.svg';
// import wxtLogo from '/wxt.svg';
import './App.css';
import { sendMessage } from '@/utils/messaging';
import { Button } from '@/components/ui/button';

function App() {
  const [count, setCount] = createSignal(0);

  createEffect(async () => {
    await sendMessage('setCount', count());
  });

  return (
    <>
      <h1 class="text-3xl font-bold text-red-600">Hello world!</h1>
      <div>
        <a href="https://wxt.dev" target="_blank">
          {/* <img src={wxtLogo} class="logo" alt="WXT logo" /> */}
        </a>
        <a href="https://solidjs.com" target="_blank">
          {/* <img src={solidLogo} class="logo solid" alt="Solid logo" /> */}
        </a>
      </div>
      <h1>WXT + Solid</h1>
      <div class="card">
        <Button
          variant="outline"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count()}
        </Button>
        <p>
          Edit <code>popup/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p class="read-the-docs">
        Click on the WXT and Solid logos to learn more
      </p>
    </>
  );
}

export default App;
