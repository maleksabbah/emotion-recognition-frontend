import Link from 'next/link';
import LegalLayout from '@/components/LegalLayout';

export const metadata = {
  title: 'Privacy Policy — mntis',
  description: 'What mntis collects when you analyse photos, video and live camera, why, how long it is kept, and your rights.',
};

const PRIVACY_EMAIL = 'privacy@mntis.app';

export default function PrivacyPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Privacy"
      italic="policy."
      updated="18 November 2026"
      intro="mntis reads facial expressions in photos, videos and live camera frames. That means we handle images of people's faces, so this policy sets out plainly what we collect, why, how long we keep it and what you can ask us to do with it."
    >
      <h2>1. Who we are</h2>
      <p>
        This policy covers the mntis website at mntis.app and the services offered through it (the
        &ldquo;Service&rdquo;), operated by mntis (&ldquo;we&rdquo;, &ldquo;us&rdquo;). We are the
        controller of the personal data described here. You can reach us about privacy at{' '}
        <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
      </p>

      <h2>2. What we collect</h2>
      <h3>2.1 Account details</h3>
      <ul>
        <li>Email address</li>
        <li>Username</li>
        <li>Password, stored only as a one-way hash. We never store or see your password in plain text.</li>
      </ul>

      <h3>2.2 Photos and videos you upload</h3>
      <p>
        The images and video files you submit for analysis. These usually show people&rsquo;s faces.
      </p>

      <h3>2.3 Live camera frames</h3>
      <p>
        When you start a live session, still frames from your camera are sent to us for as long as the
        session runs. Nothing is sent before you press start or after you stop.
      </p>

      <h3>2.4 Data we generate from your content</h3>
      <ul>
        <li>Face crops cut from your uploads and from live frames, so each face can be analysed.</li>
        <li>
          Annotated outputs: your image or video returned with the results drawn on it, and the results
          themselves &mdash; the estimated emotion, confidence, how positive or negative the expression reads
          (valence), how activated it looks (arousal) and its intensity.
        </li>
      </ul>

      <h3>2.5 Usage information</h3>
      <ul>
        <li>
          Counts and timestamps: how many photos and videos you have analysed, how many live seconds you have
          used, when sessions were created, and which plan you are on.
        </li>
        <li>
          Like most web services, our servers may record technical details such as IP address, browser type
          and request times in logs, which we use to keep the Service secure and working.
        </li>
      </ul>

      <h3>2.6 Cookies and local storage</h3>
      <p>
        We store sign-in tokens in your browser so you stay signed in. They are used only for
        authentication. We do not use advertising cookies, cross-site trackers or third-party analytics.
      </p>

      <h2>3. Why we use it</h2>
      <ul>
        <li>
          <strong>To provide results.</strong> We process your uploads and live frames to detect faces,
          estimate expressions and return annotated results, and we keep them so they appear in your
          archive.
        </li>
        <li>
          <strong>To enforce plan limits.</strong> We count analyses, file sizes, video length and live
          minutes against your plan.
        </li>
        <li>
          <strong>To secure the Service.</strong> We use account and usage information to authenticate you,
          prevent abuse and investigate problems.
        </li>
        <li>
          <strong>To contact you</strong> about your account or material changes to the Service.
        </li>
      </ul>
      <p>
        <strong>We do not use your uploads, live frames, face crops or results to train or improve
        models.</strong> We do not sell your personal data, share it for advertising, or use the Service to
        identify who a person is.
      </p>

      <h2>4. Legal bases</h2>
      <p>
        Where the UK GDPR or EU GDPR applies, we process your data to perform our contract with you
        (providing the Service you asked for), for our legitimate interests in keeping the Service secure
        and enforcing fair-use limits, and to comply with legal obligations. Images of faces, and estimates
        made from them, can be sensitive. When you upload or stream images of other people you are
        responsible for having their consent, as our <Link href="/terms">Terms</Link> require.
      </p>

      <h2>5. How long we keep it</h2>
      <p>
        <strong>We do not currently delete files automatically.</strong> Uploaded photos and videos, the
        face crops and live frames we store, and annotated outputs and results are kept so they stay
        available in your archive until you delete your account or ask us to delete them. Account details
        are kept for as long as your account exists. Usage counts are kept while your account exists so we
        can apply plan limits.
      </p>
      <p>
        To have your content or your account deleted, email{' '}
        <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> from the address on your account. We may
        keep limited records where the law requires it or to resolve disputes.
      </p>

      <h2>6. Who processes it for us</h2>
      <p>
        We use cloud hosting and storage providers to run the Service and store files. They process data
        only on our instructions and under contracts that require them to protect it. Our pages also load
        typefaces from Google Fonts, so your browser requests them from Google&rsquo;s servers. We do not
        otherwise share your data with third parties, except where required by law.
      </p>

      <h2>7. International transfers</h2>
      <p>
        Our providers may store or process data in countries other than yours, including outside the UK
        and the European Economic Area. Where that happens we rely on appropriate safeguards, such as
        adequacy decisions or standard contractual clauses.
      </p>

      <h2>8. Security</h2>
      <p>
        Data is sent over encrypted connections, passwords are stored only as hashes, and stored files are
        accessed through time-limited signed links rather than public URLs. No system is perfectly secure,
        and we will notify you and the relevant authorities of a breach where the law requires it.
      </p>

      <h2>9. Your rights</h2>
      <p>
        Depending on where you live (for example under the UK GDPR, EU GDPR or the California Consumer
        Privacy Act), you can ask us to:
      </p>
      <ul>
        <li>give you access to the personal data we hold about you;</li>
        <li>correct data that is inaccurate;</li>
        <li>delete your data;</li>
        <li>export your data in a portable format;</li>
        <li>restrict or object to certain processing.</li>
      </ul>
      <p>
        Email <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> and we will respond within the time the
        law allows (usually one month). We will not treat you differently for exercising these rights. You
        can also complain to your local data protection authority, such as the UK Information
        Commissioner&rsquo;s Office.
      </p>

      <h2>10. Children</h2>
      <p>
        The Service is not for anyone under 16, and you may not create an account if you are under 16. Do
        not upload or stream images of a minor without the consent of their parent or guardian. If you
        believe a child has given us data, contact us and we will delete it.
      </p>

      <h2>11. Changes</h2>
      <p>
        We may update this policy. We will change the date above and, for material changes, tell you by
        email or in the Service before they take effect.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions or requests: <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
      </p>
    </LegalLayout>
  );
}
