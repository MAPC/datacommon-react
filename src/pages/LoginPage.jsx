import axios from "axios";
import React, { useState } from "react";
import styled, { keyframes } from "styled-components";

const PageContainer = styled.section`
  background: #fff;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
`;

const LoginBox = styled.div`
  width: 550px;
  height: 500px;
  background: #dddddd;
  border-radius: 10px;
  box-shadow: 4px 4px 4px #dddddd;
`;

const LoginHeader = styled.div`
  width: 100%;
  height: 3.5rem;
  border-radius: 10px;
  padding: 0.5rem;
  background: #1F4E46;
  color: white;
  font-size: 22px;
  font-weight: bold;
`;

const LoginBoxContent = styled.div`
  height: calc(100% - 3.5rem);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const LoginEmailContainer = styled.div`
  width: 100%;
  padding: 2rem;
  color: #111111;
`;

const LoginEmailDescription = styled.div`
  font-size: 16px;
  margin-bottom: 1rem;
`;

const LoginEmailLabel = styled.label`
  margin-right: 0.5rem;
  font-weight: bold;
`;

const LoginEmailInput = styled.input`
  width: calc(100% - 15rem);
  padding: 0.5rem;
  border-radius: 5px;
  margin-top: 1rem;
`;

const LoginErrorMesage = styled.div`
  color: #721414;
  font-size: 16px;
`;

const LoginForgotPassword = styled.div`
  color: #24289c;
  font-size: 16px;
  cursor: pointer;

  &:hover {
    color: #1e2182
  }
`;

const LoginActionButtonsContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  width: 100%;
  padding: 1rem;
`;

const LoginSumbitButton = styled.button`
  width: 6.5rem;
  height: 2.8rem;
  padding: 0.5rem 1.5rem;
  border-radius: 10px;
  border: none;
  background: #1F4E46;
  color: white;

  &:hover {
    background: #2e5e56
  }
  
  &.disabled {
    cusrsor: not-allowed;
    pointer-events: none;
    background: #555555;
  }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  width: 20px;
  height: 20px;
  margin-left: 20px;
  border: 2px solid #ffffff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

// TODO: Handle case when user is already logged in
const LoginPage = () => {
  const [emailInputValue, setEmailInputValue] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState(null);
  const [shouldSetPassword, setShouldSetPassword] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordSetSuccessful, setPasswordSetSuccessful] = useState(false);
  const [password, setPassword] = useState('');

  const onEmailSubmitted = () => {
    setSubmittedEmail(null);
    setButtonLoading(true);
    setErrorMessage(null);
    
    axios.get(`/api/users/by-email?email=${emailInputValue}`)
      .then(resp => {
        setShouldSetPassword(resp.data?.unsetPW);
        setSubmittedEmail(emailInputValue);
      }).catch(e => {
        setErrorMessage("There was an error while sumitting the given email.")
      }).finally(() => {
        setButtonLoading(false);
      });
  };

  const onSetNewPassword = () => {
    setButtonLoading(true);
    setErrorMessage(null);
    setPasswordSetSuccessful(false);

    // newPassword and confirmNewPassword are checked for equality before submit button clicked
    axios.post(`/api/users/set-pw`, { email: submittedEmail, password: newPassword})
      .then(resp => {
        setPasswordSetSuccessful(true);
      }).catch(e => {
        setErrorMessage("There was an error while setting your new password.")
      }).finally(() => {
        setButtonLoading(false);
      });
  }

  const onLoginUser = () => {
    setButtonLoading(true);
    setErrorMessage(null);

    axios.post(`/api/users/login`, { email: submittedEmail, password: password})
      .then(resp => {
        if (resp.data?.login) {
          const now = new Date();
          const expiration = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 90); // 90 days. 
          document.cookie = `datacommon_mapc_token=${resp.data?.login}; expires=${expiration.toUTCString()};`;
          window.location.href = '/';
        } else {
          setErrorMessage("Incorrect email or password");
        }
      }).catch(e => {
        setErrorMessage("There was an error while attempting to login.")
      }).finally(() => {
        setButtonLoading(false);
      });
  }

  const sendPasswordResetEmail = () => {
    setErrorMessage(null);
    setForgotPasswordMessage(null);

    axios.post(`/api/users/request-pw-reset`, { email: submittedEmail })
      .then(resp => {
        setForgotPasswordMessage("Please check the provided email for a password reset link.")
      }).catch(e => {
        setErrorMessage("There was an error while attempting send the password reset email.")
      });
  }

  return (
    <PageContainer className="route api">
      <LoginBox>
        <LoginHeader>
          DataCommon Login
        </LoginHeader>
        <LoginBoxContent>
          <LoginEmailContainer>
            {/* User has yet to fill out the email and submit it */}
            {!submittedEmail &&
              <>
                <LoginEmailDescription>
                  Please enter your email and click "Submit"
                </LoginEmailDescription>
                <LoginEmailLabel htmlFor="datacommon-login-email-input">
                  Email:
                </LoginEmailLabel>
                <LoginEmailInput 
                  id="datacommon-login-email-input"
                  value={emailInputValue}
                  onChange={e => setEmailInputValue(e.target.value)}
                  placeholder="Email..."
                />
              </>
            }

            {/* User has submitted an email regardless of password status */}
            {submittedEmail &&
              <>
                <LoginEmailDescription>
                  Email: {submittedEmail}
                </LoginEmailDescription>
              </>
            }

            {/* For when the user is created but hasn't set a password. */}
            {/* TODO: This should be removed once we're not creating accounts for users */}
            {submittedEmail && shouldSetPassword && 
              <>
                <LoginEmailDescription>
                  Your email has been registered with us but you have not yet set a password. Please set one now. 
                </LoginEmailDescription>
                <LoginEmailLabel htmlFor="datacommon-login-password-set">
                  Password:
                </LoginEmailLabel>
                <LoginEmailInput 
                  id="datacommon-login-password-set"
                  type="password"
                  style={{'marginLeft': '60px'}}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Password..."
                />
                <div>
                  <LoginEmailLabel htmlFor="datacommon-login-password-confirm">
                    Confirm Password:
                  </LoginEmailLabel>
                  <LoginEmailInput 
                    id="datacommon-login-password-confirm"
                    type="password"
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm Password..."
                  />
                </div>
                {/* After user has set password, direct them to login. */}
                {passwordSetSuccessful && 
                  <LoginEmailDescription>
                    Your password has been set! Please return to the login screen to login.  
                  </LoginEmailDescription>
                }
              </>
            }

            {/* Regular login password prompt */}
            {submittedEmail && !shouldSetPassword &&
              <>
                <LoginEmailDescription>
                  Enter your password to login 
                </LoginEmailDescription>
                <LoginEmailLabel htmlFor="datacommon-login-password">
                  Password:
                </LoginEmailLabel>
                <LoginEmailInput 
                  id="datacommon-login-password"
                  type="password"
                  style={{'marginLeft': '60px'}}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password..."
                />
                <LoginForgotPassword
                  onClick={() => sendPasswordResetEmail()}
                >
                  Forgot Password? 
                </LoginForgotPassword>
                {forgotPasswordMessage && 
                  <LoginEmailDescription>
                    {forgotPasswordMessage}
                  </LoginEmailDescription>
                }
              </>
            }

            {errorMessage && <LoginErrorMesage>{errorMessage}</LoginErrorMesage>}
          </LoginEmailContainer>

          <LoginActionButtonsContainer>
            {/* Before user submits email */}
            {!submittedEmail &&
              <LoginSumbitButton
                onClick={onEmailSubmitted}
                className={emailInputValue.trim() ? '' : 'disabled'}
              >
                {!buttonLoading && "Submit"}
                {buttonLoading && <Spinner />}
              </LoginSumbitButton>
            }
            {/* User is setting password */}
            {submittedEmail && shouldSetPassword && !passwordSetSuccessful &&
              <LoginSumbitButton
                onClick={onSetNewPassword}
                className={(newPassword && confirmNewPassword && newPassword === confirmNewPassword) ? '' : 'disabled'}
              >
                {!buttonLoading && "Submit"}
                {buttonLoading && <Spinner />}
              </LoginSumbitButton>
            }
            {/* User has set password successfully */}
            {submittedEmail && shouldSetPassword && passwordSetSuccessful &&
              <LoginSumbitButton
                style={{ 'width': '9.5rem' }}
                onClick={() => window.location.href = '/login'}
              >
                {!buttonLoading && "Return to login"}
                {buttonLoading && <Spinner />}
              </LoginSumbitButton>
            }
            {/* User is attempting to login with their password */}
            {submittedEmail && !shouldSetPassword &&
              <LoginSumbitButton
                className={password ? '' : 'disabled'}
                onClick={onLoginUser}
              >
                {!buttonLoading && "Login"}
                {buttonLoading && <Spinner />}
              </LoginSumbitButton>
            }
          </LoginActionButtonsContainer>
        </LoginBoxContent>
      </LoginBox>
    </PageContainer>
  );
};

export default LoginPage;