import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";
import styled, { keyframes } from "styled-components";

import { logoutUser } from "../utils/cookies";

const PageContainer = styled.section`
  background: #fff;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
`;

const EmailVerificationBox = styled.div`
  width: 550px;
  height: 500px;
  background: #dddddd;
  border-radius: 10px;
  box-shadow: 4px 4px 4px #dddddd;
`;

const EmailVerificationHeader = styled.div`
  width: 100%;
  height: 3.5rem;
  border-radius: 10px;
  padding: 0.5rem;
  background: #1F4E46;
  color: white;
  font-size: 22px;
  font-weight: bold;
`;

const EmailVerificationBoxContent = styled.div`
  height: calc(100% - 3.5rem);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const EmailVerificationMainContainer = styled.div`
  width: 100%;
  padding: 2rem;
  color: #111111;
`;

const EmailVerificationDescription = styled.div`
  font-size: 16px;
  margin-bottom: 1rem;
`;

const EmailVerificationErrorMessage = styled.div`
  color: #721414;
  font-size: 16px;
`;

const EmailVerificationActionButtonsContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  width: 100%;
  padding: 1rem;
`;

const EmailVerificationSubmitButton = styled.button`
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

const EmailVerificationPage = () => {
  const { token } = useParams();
  const paramsSplit = window.location.search.split('=');
  const email = paramsSplit.length === 2 ? paramsSplit[1] : '';

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [accountVerificationSuccessful, setAccountVerificationSuccessful] = useState(false);

  const onVerifyEmail = useCallback(() => {
    setLoading(true);
    setErrorMessage(null);
    setAccountVerificationSuccessful(false);

    axios.post(`/api/users/verify-email`, { email: email, token: token})
      .then(() => {
        setAccountVerificationSuccessful(true);

        // remove any existing cookies
        logoutUser();
      }).catch(() => {
        setErrorMessage("There was an error while verifying your account.")
      }).finally(() => {
        setLoading(false);
      });
  }, [email, token]);

  useEffect(() => {
    if (email && token) {
      onVerifyEmail();
    }
  }, [email, token, onVerifyEmail]);

  return (
    <PageContainer className="route api">
      <EmailVerificationBox>
        <EmailVerificationHeader>
          DataCommon Email Verification
        </EmailVerificationHeader>
        <EmailVerificationBoxContent>
          <EmailVerificationMainContainer>
            <EmailVerificationDescription>
              Verifying your email...
            </EmailVerificationDescription>
            {loading && <Spinner />}
            {/* After verification, direct them to login. */}
            {accountVerificationSuccessful && 
                <EmailVerificationDescription>
                Your email has been verified! Please return to the login screen to login.  
                </EmailVerificationDescription>
            }

            {errorMessage && <EmailVerificationErrorMessage>{errorMessage}</EmailVerificationErrorMessage>}
          </EmailVerificationMainContainer>

          <EmailVerificationActionButtonsContainer>
            {accountVerificationSuccessful &&
                <EmailVerificationSubmitButton
                  style={{ 'width': '9.5rem' }}
                  onClick={() => window.location.href = '/login'}
                >
                  Return to login
                </EmailVerificationSubmitButton>
            }
          </EmailVerificationActionButtonsContainer>
        </EmailVerificationBoxContent>
      </EmailVerificationBox>
    </PageContainer>
  );
};

export default EmailVerificationPage;