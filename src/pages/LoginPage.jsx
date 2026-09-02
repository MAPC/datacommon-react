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
  padding-bottom: 0px;
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

const LoginErrorMessage = styled.div`
  color: #721414;
  font-size: 16px;
`;

const LoginForgotPassword = styled.div`
  color: #24289c;
  font-size: 16px;
  cursor: pointer;
  margin-top: 12px;

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

const LoginSubmitButton = styled.button`
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
    cursor: not-allowed;
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
  const [passwordInputValue, setPasswordInputValue] = useState('');
  const [buttonLoading, setButtonLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [nameInputValue, setNameInputValue] = useState('');
  const [forgotPassword, setForgotPassword] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordSetSuccessful, setPasswordSetSuccessful] = useState(false);

  const onCreateAccount = () => {
    setButtonLoading(true);
    setErrorMessage(null);
    setPasswordSetSuccessful(false);

    // newPassword and confirmNewPassword are checked for equality before submit button clicked
    axios.post(`/api/users/create-account`, 
      { email: emailInputValue, name: nameInputValue, password: newPassword})
      .then(resp => {
        setPasswordSetSuccessful(true);
      }).catch(e => {
        setErrorMessage("There was an error while creating your account.");
      }).finally(() => {
        setButtonLoading(false);
      });
  };

  const onLoginUser = () => {
    setButtonLoading(true);
    setErrorMessage(null);

    axios.post(`/api/users/login`, { email: emailInputValue, password: passwordInputValue})
      .then(resp => {
        if (resp.data?.login) {
          const now = new Date();
          const expiration = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30); // 30 days.
          document.cookie = `datacommon_mapc_token=${resp.data?.login}; expires=${expiration.toUTCString()};`;
          window.location.href = '/';
        } else {
          setErrorMessage("Incorrect email or password");
        }
      }).catch(e => {
        setErrorMessage("There was an error while attempting to login.");
      }).finally(() => {
        setButtonLoading(false);
      });
  };

  const sendPasswordResetEmail = () => {
    setErrorMessage(null);
    setForgotPasswordMessage(null);

    axios.post(`/api/users/request-pw-reset`, { email: emailInputValue })
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
            {/* Regular login password prompt */}
            {!creatingAccount && !forgotPassword &&
              <>
                <LoginEmailDescription>
                  Enter your email and password to login 
                </LoginEmailDescription>
                <LoginEmailLabel htmlFor="datacommon-login-email">
                  Email:
                </LoginEmailLabel>
                <LoginEmailInput 
                  id="datacommon-login-email"
                  style={{'marginLeft': '61px'}}
                  value={emailInputValue}
                  onChange={e => setEmailInputValue(e.target.value)}
                  placeholder="Email..."
                />
                <div>
                  <LoginEmailLabel htmlFor="datacommon-login-password">
                    Password:
                  </LoginEmailLabel>
                  <LoginEmailInput 
                    id="datacommon-login-password"
                    type="password"
                    style={{'marginLeft': '32px'}}
                    value={passwordInputValue}
                    onChange={e => setPasswordInputValue(e.target.value)}
                    placeholder="Password..."
                  />
                </div>
                <LoginForgotPassword
                  onClick={() => setForgotPassword(true)}
                >
                  Forgot Password? 
                </LoginForgotPassword>
                <LoginEmailDescription>
                  Don't have an account yet? 
                    <LoginForgotPassword 
                      style={{ display: 'inline-block', marginLeft: '12px' }}
                      onClick={() => setCreatingAccount(true)}
                    >
                      Click here to create one!
                    </LoginForgotPassword>
                </LoginEmailDescription>
              </>
            }
            {/* User forgot password */}
            {forgotPassword && 
              <>
                <LoginEmailDescription>
                  Enter your email to receive a password reset link
                </LoginEmailDescription>
                <LoginEmailLabel htmlFor="datacommon-login-email">
                  Email:
                </LoginEmailLabel>
                <LoginEmailInput 
                  id="datacommon-login-email"
                  style={{'marginLeft': '60px'}}
                  value={emailInputValue}
                  onChange={e => setEmailInputValue(e.target.value)}
                  placeholder="Email..."
                />
                {forgotPasswordMessage && 
                  <LoginEmailDescription>
                    {forgotPasswordMessage}
                  </LoginEmailDescription>
                }
              </>
            }
            {/* User is creating a new account */}
            {creatingAccount && 
              <>
                <LoginEmailDescription>
                  Please enter your information to create an account. 
                </LoginEmailDescription>
                <div>
                  <LoginEmailLabel htmlFor="datacommon-account-create-name">
                    Full Name:
                  </LoginEmailLabel>
                  <LoginEmailInput 
                    id="datacommon-account-create-name"
                    style={{'marginLeft': '58px'}}
                    value={nameInputValue}
                    onChange={e => setNameInputValue(e.target.value)}
                    placeholder="Full Name..."
                  />
                </div>
                <div>
                  <LoginEmailLabel htmlFor="datacommon-account-create-email">
                    Email:
                  </LoginEmailLabel>
                  <LoginEmailInput 
                    id="datacommon-account-create-email"
                    style={{'marginLeft': '89px'}}
                    value={emailInputValue}
                    onChange={e => setEmailInputValue(e.target.value)}
                    placeholder="Email..."
                  />
                </div>
                <div>
                  <LoginEmailLabel htmlFor="datacommon-login-password-set">
                    Password:
                  </LoginEmailLabel>
                  <LoginEmailInput 
                    id="datacommon-login-password-set"
                    type="password"
                    style={{'marginLeft': '59px'}}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Password..."
                  />
                </div>
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
                    Your Account has been created! Please verify your email using the link that was sent to you before logging in. 
                  </LoginEmailDescription>
                }
              </>
            }

            {errorMessage && <LoginErrorMessage>{errorMessage}</LoginErrorMessage>}
          </LoginEmailContainer>

          <LoginActionButtonsContainer>
            {/* User is attempting to login normally */}
            {!creatingAccount && !forgotPassword &&
              <LoginSubmitButton
                className={(passwordInputValue && emailInputValue) ? '' : 'disabled'}
                onClick={onLoginUser}
              >
                {!buttonLoading && "Login"}
                {buttonLoading && <Spinner />}
              </LoginSubmitButton>
            }
            {/* User forgot password */}
            {!creatingAccount && forgotPassword &&
              <LoginSubmitButton
                className={(emailInputValue) ? '' : 'disabled'}
                style={{ width: '140px' }}
                onClick={sendPasswordResetEmail}
              >
                {!buttonLoading && "Send Email"}
                {buttonLoading && <Spinner />}
              </LoginSubmitButton>
            }
            {/* User is creating an account */}
            {creatingAccount && !passwordSetSuccessful &&
              <LoginSubmitButton
                onClick={onCreateAccount}
                className={(newPassword && confirmNewPassword && newPassword === confirmNewPassword && emailInputValue && nameInputValue) ? '' : 'disabled'}
              >
                {!buttonLoading && "Submit"}
                {buttonLoading && <Spinner />}
              </LoginSubmitButton>
            }
            {/* User has set password successfully */}
            {creatingAccount && passwordSetSuccessful &&
              <LoginSubmitButton
                style={{ 'width': '9.5rem' }}
                onClick={() => window.location.href = '/login'}
              >
                {!buttonLoading && "Return to login"}
                {buttonLoading && <Spinner />}
              </LoginSubmitButton>
            }
          </LoginActionButtonsContainer>
        </LoginBoxContent>
      </LoginBox>
    </PageContainer>
  );
};

export default LoginPage;