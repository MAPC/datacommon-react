import axios from "axios";
import React, { useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";

const PageContainer = styled.section`
  background: #fff;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
`;

const AccountCreationBox = styled.div`
  width: 600px;
  height: 550px;
  background: #dddddd;
  border-radius: 10px;
  box-shadow: 4px 4px 4px #dddddd;
`;

const Header = styled.div`
  width: 100%;
  height: 3.5rem;
  border-radius: 10px;
  padding: 0.5rem;
  background: #1F4E46;
  color: white;
  font-size: 22px;
  font-weight: bold;
`;

const BoxContent = styled.div`
  height: calc(100% - 3.5rem);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const InputsContainer = styled.div`
  width: 100%;
  padding: 1rem 2rem;
  padding-bottom: 0px;
  color: #111111;
`;

const InputDescription = styled.div`
  font-size: 16px;
  margin-bottom: 0.5rem;
`;

const InputLabel = styled.label`
  margin-right: 0.5rem;
  font-weight: bold;
`;

const TextInput = styled.input`
  width: calc(100% - 15rem);
  padding: 0.5rem;
  border-radius: 5px;
  margin-top: 1rem;
`;

const MuniSelect = styled.select`
  width: 293px;
  border: 2px solid black;
  border-radius: 4px;
  height: 42px;
`;

const MuniOption = styled.option`

`;

const ErrorMessage = styled.div`
  color: #721414;
  font-size: 16px;
`;

const ActionButtonsContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  width: 100%;
  padding: 1rem;
`;

const SubmitButton = styled.button`
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

const AVAILABLE_MUNIS = [
  // RLDB munis
  { id: 10, name: "Arlington" },
  { id: 35, name: "Boston" },
  { id: 49, name: "Cambridge" },
  { id: 176, name: "Medford" },
  { id: 243, name: "Quincy" },
  { id: 274, name: "Somerville" },
  
  // NSPC munis:
  { id: 48, name: "Burlington" }, 
  { id: 164, name: "Lynnfield" },
  { id: 213, name: "North Reading" },
  { id: 246, name: "Reading" },
  { id: 284, name: "Stoneham" },
  { id: 305, name: "Wakefield" }, 
  { id: 342, name: "Wilmington" },
  { id: 344, name: "Winchester" },
  { id: 347, name: "Woburn" },
];

const MuniAccountCreationPage = () => {
  const [emailInputValue, setEmailInputValue] = useState('');
  const [buttonLoading, setButtonLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedMuniId, setSelectedMuniId] = useState(-1);
  const [nameInputValue, setNameInputValue] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordSetSuccessful, setPasswordSetSuccessful] = useState(false);

  const sortedMunis = useMemo(() => {
    return AVAILABLE_MUNIS.sort((a, b) => a.name.localeCompare(b.name));
  }, [AVAILABLE_MUNIS]);

  const onCreateAccount = () => {
    setButtonLoading(true);
    setErrorMessage(null);
    setPasswordSetSuccessful(false);

    // newPassword and confirmNewPassword are checked for equality before submit button clicked
    axios.post(`/api/users/create-account`, 
      { email: emailInputValue, name: nameInputValue, password: newPassword, muni_id: selectedMuniId })
      .then(resp => {
        setPasswordSetSuccessful(true);
      }).catch(e => {
        setErrorMessage("There was an error while creating your account.");
      }).finally(() => {
        setButtonLoading(false);
      });
  };

  return (
    <PageContainer className="route api">
      <AccountCreationBox>
        <Header>
          Municipal Account Creation
        </Header>
        <BoxContent>
          <InputsContainer>
            <InputDescription>
              Please enter your information to create an account. 
            </InputDescription>
            <div>
              <InputLabel htmlFor="datacommon-account-create-muni-select">
                Select municipality:
              </InputLabel>
              <MuniSelect 
                id="datacommon-account-create-muni-select"
                style={{'marginLeft': '10px'}}
                value={selectedMuniId}
                onChange={e => setSelectedMuniId(e.target.value)}
                placeholder="Pick your municipality"
              >
                <MuniOption value={-1}>Pick your municipality</MuniOption>
                {sortedMunis.map(muni => (
                  <MuniOption key={muni.id} value={muni.id}>{muni.name}</MuniOption>
                ))}
              </MuniSelect>
            </div>
            <div>
              <InputLabel htmlFor="datacommon-account-create-name">
                Full Name:
              </InputLabel>
              <TextInput 
                id="datacommon-account-create-name"
                style={{'marginLeft': '73px'}}
                value={nameInputValue}
                onChange={e => setNameInputValue(e.target.value)}
                placeholder="Full Name..."
              />
            </div>
            <div>
              <InputLabel htmlFor="datacommon-account-create-email">
                Email:
              </InputLabel>
              <TextInput 
                id="datacommon-account-create-email"
                style={{'marginLeft': '103px'}}
                value={emailInputValue}
                onChange={e => setEmailInputValue(e.target.value)}
                placeholder="Email..."
              />
            </div>
            <div>
              <InputLabel htmlFor="datacommon-login-password-set">
                Password:
              </InputLabel>
              <TextInput 
                id="datacommon-login-password-set"
                type="password"
                style={{'marginLeft': '73px'}}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Password..."
              />
            </div>
            <div>
              <InputLabel htmlFor="datacommon-login-password-confirm">
                Confirm Password:
              </InputLabel>
              <TextInput 
                id="datacommon-login-password-confirm"
                type="password"
                style={{'marginLeft': '14px'}}
                value={confirmNewPassword}
                onChange={e => setConfirmNewPassword(e.target.value)}
                placeholder="Confirm Password..."
              />
            </div>
            {/* After user has set password, direct them to login. */}
            {passwordSetSuccessful && 
              <InputDescription>
                Your Account has been created! Please verify your email using the link that was sent to you before logging in. 
              </InputDescription>
            }
            {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
          </InputsContainer>

          <ActionButtonsContainer>            
            {!passwordSetSuccessful &&
              <SubmitButton
                onClick={onCreateAccount}
                className={(newPassword && confirmNewPassword && newPassword === confirmNewPassword && emailInputValue && nameInputValue) ? '' : 'disabled'}
              >
                {!buttonLoading && "Submit"}
                {buttonLoading && <Spinner />}
              </SubmitButton>
            }
            {/* User has set password successfully */}
            {passwordSetSuccessful &&
              <SubmitButton
                style={{ 'width': '9.5rem' }}
                onClick={() => window.location.href = '/login'}
              >
                {!buttonLoading && "Return to login"}
                {buttonLoading && <Spinner />}
              </SubmitButton>
            }
          </ActionButtonsContainer>
        </BoxContent>
      </AccountCreationBox>
    </PageContainer>
  );
};

export default MuniAccountCreationPage;