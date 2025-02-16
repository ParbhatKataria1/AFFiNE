import { notify, Wrapper } from '@affine/component';
import {
  AuthInput,
  BackButton,
  ModalHeader,
} from '@affine/component/auth-components';
import { Button } from '@affine/component/ui/button';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { AuthService, CaptchaService } from '@affine/core/modules/cloud';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';
import type { FC } from 'react';
import { useCallback, useState } from 'react';

import type { AuthPanelProps } from './index';
import * as styles from './style.css';
import { Captcha } from './use-captcha';

export const SignInWithPassword: FC<AuthPanelProps<'signInWithPassword'>> = ({
  setAuthData,
  email,
  redirectUrl,
}) => {
  const t = useI18n();
  const authService = useService(AuthService);

  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const captchaService = useService(CaptchaService);

  const verifyToken = useLiveData(captchaService.verifyToken$);
  const needCaptcha = useLiveData(captchaService.needCaptcha$);
  const challenge = useLiveData(captchaService.challenge$);
  const [isLoading, setIsLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const onSignIn = useAsyncCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      captchaService.revalidate();
      await authService.signInPassword({
        email,
        password,
        verifyToken,
        challenge,
      });
    } catch (err) {
      console.error(err);
      setPasswordError(true);
    } finally {
      setIsLoading(false);
    }
  }, [
    isLoading,
    verifyToken,
    captchaService,
    authService,
    email,
    password,
    challenge,
  ]);

  const sendMagicLink = useAsyncCallback(async () => {
    if (sendingEmail) return;
    setSendingEmail(true);
    try {
      captchaService.revalidate();
      await authService.sendEmailMagicLink(
        email,
        verifyToken,
        challenge,
        redirectUrl
      );
      setAuthData({ state: 'afterSignInSendEmail' });
    } catch (err) {
      console.error(err);
      notify.error({
        title: 'Failed to send email, please try again.',
      });
      // TODO(@eyhn): handle error better
    }
    setSendingEmail(false);
  }, [
    sendingEmail,
    verifyToken,
    captchaService,
    authService,
    email,
    challenge,
    redirectUrl,
    setAuthData,
  ]);

  const sendChangePasswordEmail = useCallback(() => {
    setAuthData({ state: 'sendEmail', emailType: 'changePassword' });
  }, [setAuthData]);

  return (
    <>
      <ModalHeader
        title={t['com.affine.auth.sign.in']()}
        subTitle={t['com.affine.brand.affineCloud']()}
      />

      <Wrapper
        marginTop={30}
        style={{
          position: 'relative',
        }}
      >
        <AuthInput
          label={t['com.affine.settings.email']()}
          disabled={true}
          value={email}
        />
        <AuthInput
          autoFocus
          data-testid="password-input"
          label={t['com.affine.auth.password']()}
          value={password}
          type="password"
          onChange={useCallback((value: string) => {
            setPassword(value);
          }, [])}
          error={passwordError}
          errorHint={t['com.affine.auth.password.error']()}
          onEnter={onSignIn}
        />
        <div
          className={styles.forgetPasswordButtonRow}
          style={{ display: 'none' }} // Not implemented yet.
        >
          <a
            className={styles.linkButton}
            onClick={sendChangePasswordEmail}
            style={{
              color: 'var(--affine-text-secondary-color)',
              fontSize: 'var(--affine-font-sm)',
            }}
          >
            {t['com.affine.auth.forget']()}
          </a>
        </div>
        {(verifyToken || !needCaptcha) && (
          <div className={styles.sendMagicLinkButtonRow}>
            <a
              data-testid="send-magic-link-button"
              className={styles.linkButton}
              onClick={sendMagicLink}
            >
              {t['com.affine.auth.sign.auth.code.send-email.sign-in']()}
            </a>
          </div>
        )}
        {!verifyToken && needCaptcha && <Captcha />}
        <Button
          data-testid="sign-in-button"
          variant="primary"
          size="extraLarge"
          style={{ width: '100%' }}
          disabled={isLoading || (!verifyToken && needCaptcha)}
          onClick={onSignIn}
        >
          {t['com.affine.auth.sign.in']()}
        </Button>
      </Wrapper>
      <BackButton
        onClick={useCallback(() => {
          setAuthData({ state: 'signIn' });
        }, [setAuthData])}
      />
    </>
  );
};
