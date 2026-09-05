import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import EditorialApp from './EditorialApp';
import { ClerkProvider, SignedIn, SignedOut, SignIn, SignUp } from '@clerk/clerk-react';

const PUBLISHABLE_KEY = "pk_live_Y2xlcmsucHJvdmVuYW50Zm9yZW5zaWNzLmNvbSQ";

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

// 1. Read the URL parameters globally
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode');
const plan = urlParams.get('plan');
const isInvite = urlParams.has('__clerk_ticket'); 

// 2. Create a smart routing component for users who are logged in
function AppController() {
  useEffect(() => {
    // If they are a new buyer and NOT an invited team member, send them to Stripe
    if (mode === 'signup' && !isInvite) {
      let stripeUrl = "https://buy.stripe.com/00w6oHh0XeccdRFcV4gYU07"; // Writers tier
      if (plan === "enterprise") {
        stripeUrl = "https://buy.stripe.com/fZuaEX9yv7NO3d1cV4gYU06"; // Enterprise tier
      }
      window.location.href = stripeUrl;
    }
  }, []);

  // Show a seamless loading screen while Stripe loads so the writing pad doesn't flash
  if (mode === 'signup' && !isInvite) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
        <h2>Routing to secure checkout...</h2>
      </div>
    );
  }

  // If they are an invitee or a returning user, load the writing pad!
  return <EditorialApp />;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      
      {/* 3. If logged in, let the AppController intercept the Stripe handoff or load the app */}
      <SignedIn>
        <AppController />
      </SignedIn>

      {/* 4. If not logged in, show the correct Clerk auth box */}
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