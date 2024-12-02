import { Button } from '@/components/ui/button';
import iconUrl from '~/assets/icon.png';

function redirect() {
  if (window.history.length > 2) {
    window.history.go(-2);
  }
}

function App() {
  return (
    <div class="flex h-screen w-full items-center justify-center bg-red-800 text-center">
      <div>
        <div class="flex w-full items-center">
          <img src={iconUrl} alt="warning" class="w-52" />
          <div class="w-[40rem]">
            <h1 class="text-right text-5xl text-white drop-shadow-md">
              This website is dangerous!
            </h1>
            <p class="mt-5 text-right text-white drop-shadow-md">
              We've identified suspicious activity that may compromise your
              personal information. Please proceed with caution and avoid
              entering any sensitive data. For your security, we recommend
              leaving this page immediately and verifying the website's
              authenticity through official channels. Stay safe online!
            </p>
          </div>
        </div>
        <div class="flex justify-end">
          <Button on:click={() => redirect()}>Back to safety</Button>
        </div>
      </div>
    </div>
  );
}

export default App;
