import React from 'react';
import ReactDOM from 'react-dom/client';
import EditorialApp from './EditorialApp';
import { ClerkProvider, SignedIn, SignedOut, SignIn, SignUp } from '@clerk/clerk-react';

const PUBLISHABLE_KEY = "pk_live_Y2xlcmsucHJvdmVuYW50Zm9yZW5zaWNzLmNvbSQ";

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

// 1. Read the URL parameters passed from your landing page
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode');
const plan = urlParams.get('plan');

// 2. Assign the correct Stripe link based on their choice
let stripeUrl = "https://buy.stripe.com/00w6oHh0XeccdRFcV4gYU07"; // Default to Writers
if (plan === "enterprise") {
    stripeUrl = "https://buy.stripe.com/fZuaEX9yv7NO3d1cV4gYU06";
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      
      {/* Once invited and logged in, they go straight to the pad */}
      <SignedIn>
        <EditorialApp />
      </SignedIn>

      {/* If not logged in, route to Sign Up or Sign In based on URL params */}
      <SignedOut>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh', 
          width: '100vw',
          backgroundColor: '#0f172a' 
        }}>
          {mode === 'signup' ? (
            <SignUp forceRedirectUrl={stripeUrl} signInUrl="/Editorial-writingpad.html" />
          ) : (
            <SignIn signUpUrl="/Editorial-writingpad.html?mode=signup&plan=writers" />
          )}
        </div>
      </SignedOut>

    </ClerkProvider>
  </React.StrictMode>
);