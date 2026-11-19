import Link from 'next/link';
import LegalLayout from '@/components/LegalLayout';

export const metadata = {
  title: 'Terms of Service — mntis',
  description: 'The terms for using mntis, including consent, prohibited uses and what results mean.',
};

const CONTACT_EMAIL = 'hello@mntis.app';

export default function TermsPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Terms of"
      italic="service."
      updated="18 November 2026"
      intro="These terms govern your use of mntis. They include rules about whose faces you may analyse and what the Service may not be used for. Please read them."
    >
      <h2>1. Acceptance</h2>
      <p>
        By creating an account or using mntis.app and the services offered through it (the
        &ldquo;Service&rdquo;), operated by mntis (&ldquo;we&rdquo;, &ldquo;us&rdquo;), you agree to these
        Terms and to our <Link href="/privacy">Privacy Policy</Link>. If you do not agree, do not use the
        Service. If you use the Service on behalf of an organisation, you confirm you are authorised to
        accept these Terms for it.
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>You must be at least 16 years old to create an account.</li>
        <li>Give accurate information and keep it up to date.</li>
        <li>
          Keep your password secure. You are responsible for activity on your account; tell us promptly at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> if you think it has been misused.
        </li>
        <li>One person per account. Do not share accounts or create several to get around limits.</li>
      </ul>

      <h2>3. Consent of the people you analyse</h2>
      <p>
        <strong>You must have the consent of every person whose face appears in a photo, video or live
        stream you submit</strong>, and any other permission the law where you and they are located
        requires. For a minor, that means the consent of their parent or guardian. You are responsible for
        obtaining and being able to show this consent.
      </p>

      <h2>4. Prohibited uses</h2>
      <p>You may not use the Service, or any result from it, to:</p>
      <ul>
        <li>infer the emotions of employees, job applicants or students, or otherwise in a workplace or educational setting;</li>
        <li>carry out surveillance of, monitor or track individuals;</li>
        <li>support law enforcement, border control, immigration or similar purposes;</li>
        <li>
          make or inform decisions that have legal or similarly significant effects on a person, such as
          decisions about employment, credit, insurance, housing, education, healthcare or access to
          services;
        </li>
        <li>identify people, or match or compare faces to work out who someone is;</li>
        <li>analyse minors without the consent of their parent or guardian;</li>
        <li>process images you do not have the right to use, or that are unlawful, harassing or exploitative;</li>
        <li>reverse engineer, decompile or attempt to extract the models or source code behind the Service;</li>
        <li>scrape, crawl or access the Service by automated means other than through features we provide;</li>
        <li>circumvent plan limits, rate limits or security measures, for example by using multiple accounts;</li>
        <li>interfere with or disrupt the Service or other users.</li>
      </ul>
      <p>We may suspend or remove access, and delete content, if we reasonably believe these rules have been broken.</p>

      <h2>5. What results mean</h2>
      <p>
        Results are <strong>probabilistic estimates of facial expressions</strong>. They describe how a
        face looks in an image, not what anyone actually feels, intends or thinks. Expressions vary between
        people and cultures, and results can be wrong, especially with poor lighting, partial faces or
        unusual angles.
      </p>
      <p>
        Results are <strong>not medical, psychological, psychiatric or diagnostic advice</strong>, and must
        not be used as a substitute for a qualified professional or as the basis of the decisions listed in
        section 4.
      </p>

      <h2>6. Plans and limits</h2>
      <ul>
        <li>
          We currently offer a free plan with monthly limits on photos, videos and live minutes, and limits
          on file size, video length and upload rate. Current limits are shown on the{' '}
          <Link href="/pricing">pricing page</Link> and in the app.
        </li>
        <li>Monthly allowances reset on the first day of each month (UTC). Unused allowance does not carry over.</li>
        <li>
          We may introduce paid plans later. Any paid plan will have its price and terms shown before you
          subscribe, and you will not be charged without agreeing to them.
        </li>
        <li>We may change plans and limits. Where a change materially reduces what your plan includes, we will tell you in advance.</li>
      </ul>

      <h2>7. Your content</h2>
      <p>
        You keep ownership of the photos and videos you submit and of the results generated from them
        (&ldquo;Your Content&rdquo;). You give us a limited, non-exclusive, worldwide, royalty-free licence
        to host, copy, process and display Your Content only as needed to provide the Service to you
        &mdash; for example to analyse it, store it in your archive and show it back to you. This licence
        ends when Your Content is deleted, except for copies we must keep by law. We do not use Your Content
        to train models.
      </p>
      <p>You confirm you have the rights and consents needed to submit Your Content and to grant this licence.</p>

      <h2>8. Our service</h2>
      <p>
        The Service, including its software, models and design, belongs to us and our licensors. These
        Terms give you a personal, non-transferable right to use it in line with these Terms, and nothing
        more.
      </p>

      <h2>9. Termination</h2>
      <p>
        You can stop using the Service at any time and ask us to delete your account at{' '}
        <a href="mailto:privacy@mntis.app">privacy@mntis.app</a>. We may suspend or end your access if you
        breach these Terms, if required by law, or if we stop offering the Service, giving notice where
        reasonable. Sections 5, 7 (as to ownership), 8, 10 and 11 survive termination.
      </p>

      <h2>10. Disclaimers and limitation of liability</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the extent the law
        allows, we make no warranties, express or implied, including about accuracy, fitness for a
        particular purpose or uninterrupted availability.
      </p>
      <p>
        To the extent the law allows, we are not liable for indirect, incidental, special or consequential
        losses, or for loss of data, profits or goodwill, and our total liability arising from the Service
        is limited to the amount you paid us for the Service in the 12 months before the claim.
        Nothing in these Terms limits liability that cannot be limited by law, such as for death or
        personal injury caused by negligence, or for fraud.
      </p>
      <p>
        You are responsible for how you use the Service and its results, and you agree to cover our
        reasonable losses arising from your breach of sections 3 or 4.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These Terms are governed by the laws applicable where the operator is established. If you are a
        consumer, you also keep any protections given to you by the mandatory laws of the country where you
        live.
      </p>

      <h2>12. Changes to these terms</h2>
      <p>
        We may update these Terms. We will change the date above and, for material changes, tell you before
        they take effect. Continuing to use the Service after that means you accept the updated Terms.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions about these Terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalLayout>
  );
}
