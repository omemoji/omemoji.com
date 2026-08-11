import SNSList from "@/components/SNSList";

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
