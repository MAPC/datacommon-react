import axios from "axios";
import React, { useState } from "react";
import { useParams } from "react-router";
import { useSearchParams } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { logoutUser } from "../utils/cookies";

const PageContainer = styled.section`
  background: #fff;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
`;

const PasswordResetBox = styled.div`
  width: 550px;
  height: 500px;
  background: #dddddd;
  border-radius: 10px;
  box-shadow: 4px 4px 4px #dddddd;
`;

const PasswordResetHeader = styled.div`
  width: 100%;
  height: 3.5rem;
  border-radius: 10px;
  padding: 0.5rem;
  background: #1F4E46;
  color: white;
  font-size: 22px;
  font-weight: bold;
`;

const PasswordResetBoxContent = styled.div`
  height: calc(100% - 3.5rem);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const PasswordResetMainContainer = styled.div`
  width: 100%;
  padding: 2rem;
  color: #111111;
`;

const PasswordResetDescription = styled.div`
  font-size: 16px;
  margin-bottom: 1rem;
`;

const PasswordResetLabel = styled.label`
  margin-right: 0.5rem;
  font-weight: bold;
`;

const PasswordResetInput = styled.input`
  width: calc(100% - 15rem);
  padding: 0.5rem;
  border-radius: 5px;
  margin-top: 1rem;
`;

const PasswordResetErrorMesage = styled.div`
  color: #721414;
  font-size: 16px;
`;

const PasswordResetActionButtonsContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  width: 100%;
  padding: 1rem;
`;

const PasswordResetSumbitButton = styled.button`
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

const PasswordResetPage = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');

  const [buttonLoading, setButtonLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordSetSuccessful, setPasswordSetSuccessful] = useState(false);

  const onPasswordReset = () => {
    setButtonLoading(true);
    setErrorMessage(null);
    setPasswordSetSuccessful(false);

    // newPassword and confirmNewPassword are checked for equality before submit button clicked
    axios.post(`/api/users/reset-pw`, { email: email, password: newPassword, token: token})
      .then(resp => {
        setPasswordSetSuccessful(true);

        // remove any existing cookies
        logoutUser();
      }).catch(e => {
        setErrorMessage("There was an error while setting your new password.")
      }).finally(() => {
        setButtonLoading(false);
      });
  }

  return (
    <PageContainer className="route api">
      <PasswordResetBox>
        <PasswordResetHeader>
          DataCommon Password Reset
        </PasswordResetHeader>
        <PasswordResetBoxContent>
          <PasswordResetMainContainer>
            <PasswordResetDescription>
                Please enter a new password for your DataCommon account. 
            </PasswordResetDescription>
            <PasswordResetLabel htmlFor="datacommon-login-password-set">
                Password:
            </PasswordResetLabel>
            <PasswordResetInput 
                id="datacommon-login-password-set"
                type="password"
                style={{'marginLeft': '60px'}}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Password..."
            />
            <div>
                <PasswordResetLabel htmlFor="datacommon-login-password-confirm">
                Confirm Password:
                </PasswordResetLabel>
                <PasswordResetInput 
                id="datacommon-login-password-confirm"
                type="password"
                value={confirmNewPassword}
                onChange={e => setConfirmNewPassword(e.target.value)}
                placeholder="Confirm Password..."
                />
            </div>
            {/* After user has set password, direct them to login. */}
            {passwordSetSuccessful && 
                <PasswordResetDescription>
                Your password has been set! Please return to the login screen to login.  
                </PasswordResetDescription>
            }

            {errorMessage && <PasswordResetErrorMesage>{errorMessage}</PasswordResetErrorMesage>}
          </PasswordResetMainContainer>

          <PasswordResetActionButtonsContainer>
            <>
              {!passwordSetSuccessful &&
                <PasswordResetSumbitButton
                  onClick={onPasswordReset}
                  className={(newPassword && confirmNewPassword && newPassword === confirmNewPassword) ? '' : 'disabled'}
                >
                  {!buttonLoading && "Submit"}
                  {buttonLoading && <Spinner />}
                </PasswordResetSumbitButton>
              }

              {passwordSetSuccessful &&
                <PasswordResetSumbitButton
                  style={{ 'width': '9.5rem' }}
                  onClick={() => window.location.href = '/login'}
                >
                  {!buttonLoading && "Return to login"}
                  {buttonLoading && <Spinner />}
                </PasswordResetSumbitButton>
              }
            </>
          </PasswordResetActionButtonsContainer>
        </PasswordResetBoxContent>
      </PasswordResetBox>
    </PageContainer>
  );
};

export default PasswordResetPage;