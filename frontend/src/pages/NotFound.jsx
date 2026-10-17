import { Link } from 'react-router-dom';
import StateMessage from '../components/StateMessage';

export default function NotFound() {
  return (
    <section className="container section">
      <StateMessage
        title="Page not found"
        action={
          <Link to="/" className="btn btn-light">
            Back to home
          </Link>
        }
      >
        The page you are looking for doesn&apos;t exist.
      </StateMessage>
    </section>
  );
}
