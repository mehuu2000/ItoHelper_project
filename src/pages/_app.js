import "../styles/globals.css";
import OrientationLock from "../components/OrientationLock";
import { SessionProvider } from "next-auth/react";

export default function MyApp({ Component, pageProps }) {
    return (
      <SessionProvider session={pageProps.session}>  {/* SessionProvider を追加 */}
        {/* <OrientationLock /> */}
        <Component {...pageProps} />
      </SessionProvider>
    );
  }
