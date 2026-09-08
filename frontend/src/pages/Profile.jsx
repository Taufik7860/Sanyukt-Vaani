import {
  UserRound,
  Languages,
  Volume2,
  ShieldCheck,
  Clock3,
  ChevronRight
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

function Profile() {
  const { t } = useLanguage();

  return (
    <>
      <div className="page-header">

        <div>

          <div className="eyebrow">
            PREFERENCES
          </div>

          <h2>
            {t.profile}
          </h2>

          <p>
            {t.auto}
          </p>

        </div>

      </div>


      <div className="settings-grid">

        <section className="panel">

          <h3>
            Language & Voice
          </h3>

          <p className="panel-desc">
            Choose how Sanyukt Vaani AI
            communicates with you.
          </p>

          <Setting
            icon={Languages}
            title="Language"
            value="Auto Detect"
          />

          <Setting
            icon={Volume2}
            title="Voice responses"
            value="Enabled"
          />

          <Setting
            icon={UserRound}
            title="Preferred voice"
            value="Natural"
          />

        </section>


        <section className="panel">

          <h3>
            Privacy & Security
          </h3>

          <p className="panel-desc">
            Control your personal information.
          </p>

          <Setting
            icon={ShieldCheck}
            title="Conversation history"
            value="Enabled"
          />

          <Setting
            icon={Clock3}
            title="Audio retention"
            value="Not stored by default"
          />

          <Setting
            icon={ShieldCheck}
            title="Account security"
            value="Protected"
          />

        </section>

      </div>

    </>
  );
}


function Setting({
  icon: Icon,
  title,
  value
}) {

  return (
    <div className="setting-row">

      <div className="setting-icon">

        <Icon size={17} />

      </div>

      <div>

        <strong>
          {title}
        </strong>

        <span>
          {value}
        </span>

      </div>

      <ChevronRight size={16} />

    </div>
  );
}

export default Profile;