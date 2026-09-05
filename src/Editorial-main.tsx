import React from 'react';
import ReactDOM from 'react-dom/client';
import EditorialApp from './EditorialApp';
import { ClerkProvider, SignedIn, SignedOut, SignIn, SignUp } from '@clerk/clerk-react';

const PUBLISHABLE_KEY = "pk_live_Y2xlcmsucHJvdmVuYW50Zm9yZW5zaWNzLmNvbSQ";

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

// 1. Read the URL parameters
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode');
const plan = urlParams.get('plan');
const isInvite = urlParams.has('__clerk_ticket'); // Detects the secret tag in Clerk invite emails

// 2. Assign the correct Stripe link for public buyers
let stripeUrl = "https://buy.stripe.com/00w6oHh0XeccdRFcV4gYU07"; // Default to Writers
if (plan === "enterprise") {
    stripeUrl = "https://buy.stripe.com/fZuaEX9yv7NO3d1cV4gYU06";
}

// 3. The Routing Logic: 
// If they clicked an email invite, skip Stripe and send to the pad. Otherwise, send to Stripe.
const finalRedirectUrl = isInvite ? "/Editorial-writingpad.html" : stripeUrl;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      
      {/* Once logged in, they go straight to the pad */}
      <SignedIn>
        <EditorialApp />
      </SignedIn>

      {/* If not logged in, show the correct auth box */}
      <SignedOut>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh', 
          width: '100vw',
          backgroundColor: '#0f172a' 
        }}>
          {mode === 'signup' || isInvite ? (
            <SignUp 
              routing="hash" 
              forceRedirectUrl={finalRedirectUrl} 
              signInUrl="/Editorial-writingpad.html" 
            />
          ) : (
            <SignIn 
              routing="hash" 
              signUpUrl="/Editorial-writingpad.html?mode=signup&plan=writers" 
            />
          )}
        </div>
      </SignedOut>

    </ClerkProvider>
  </React.StrictMode>
);