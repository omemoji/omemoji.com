import SNSList from "@/components/SNSList";

const COMMENT_FORM =
  "https://docs.google.com/forms/d/e/1FAIpQLSegu77jt7W0JTHs9wfRIT3aPXFIItcKb_lE_kcJlTLJLXFVeg/viewform?usp=dialog";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-meta">
        <small>© 2023 - {new Date().getFullYear()} omemoji</small>
        <SNSList />
      </div>
    </footer>
  );
}
