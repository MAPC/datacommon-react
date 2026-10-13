import { faPen } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";

const UserProfileContainer = styled.div`
  width: 100%;
  padding-left: 30px;
  padding-right: 150px;
`;

const UserProfileHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 28px;
  font-weight: bold;
  color: #111111;
  padding-bottom: 24px;
`;

const EditIconContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  font-size: 16px;
  font-weight: normal;
  color: #333333;
  cursor: pointer;
  border: 1px solid #333333;
  border-radius: 8px;
  user-select: none;

  &:hover {
    color: #4c4c4c;
  }
`;
const ErrorMessage = styled.div`
  color: #991111;
  margin-bottom: 12px;
`;

const UserProfileAttributes = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-left: 28px;
`;

const UserProfileAttribute = styled.div`
  display: flex;
  gap: 12px;
  color: #111111;
`;

const AttributeTag = styled.div`
  width: 120px;
`;

const EditingProfileContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: calc(100% - 80px);
`;

const EditInput = styled.input`
  padding: 4px 8px;
  width: 300px;
`;

const ActionButtonsContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;

const CancelButton = styled.button`
  background-color: #dddddd;
  cursor: pointer;
  border: none;
  border-radius: 4px;
  color: #111111;
  font-size: 18px;
  padding: 6px 12px;

  &:hover {
    background-color: #cccccc;
  }
`;

const SubmitButton = styled.button`
  background-color: #1F4E46;
  cursor: pointer;
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 18px;
  padding: 6px 12px;

  &:hover {
    background-color: #276259;
  }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  width: 60px;
  height: 60px;
  margin-left: 200px;
  margin-top: 20px;
  border: 2px solid #978080;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const ProfileMyProfilePage = () => {
  const [myUser, setMyUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [errorText, setErrorText] = useState(null);
  const [editingName, setEditingName] = useState(null);

  useEffect(() => {
    axios.get("/api/users/me")
      .then(res => {
        const user = res.data?.user;
        setMyUser(user);
        setEditingName(user?.name);
      }).catch(() => {
        setErrorText("Error while fetching user info");
        setMyUser(null);
      }).finally(() => {
        setLoading(false);
      });
  }, []);

  const handleNameChangeSubmit = async () => {
    setErrorText(null);
    setLoading(true);
    try {
      await axios.post("/api/users/rename-me", { name: editingName })
    } catch {
      setErrorText("Error while attempting to update user");
      setLoading(false);
      return;
    }

    axios.get("/api/users/me")
      .then(res => {
        const user = res.data?.user;
        setMyUser(user);
        setEditingName(user?.name);
        setEditing(false);
      }).catch(() => {
        setErrorText("Error while fetching user info");
        setMyUser(null);
      }).finally(() => {
        setLoading(false);
      });
  };

  return (
    <UserProfileContainer>
      <UserProfileHeader>
        User Profile
        <EditIconContainer onClick={() => setEditing(!editing)}>
          <FontAwesomeIcon icon={faPen} />
          {editing ? "Cancel Edits" : "Edit Profile"}
        </EditIconContainer>
      </UserProfileHeader>
      {errorText && <ErrorMessage>{errorText}</ErrorMessage>}
      {loading && <Spinner />}
      {!loading && !editing && myUser && (
        <UserProfileAttributes>
            <UserProfileAttribute>
              <AttributeTag>Name:</AttributeTag>
              <div>{myUser.name}</div>
            </UserProfileAttribute>
            <UserProfileAttribute>
              <AttributeTag>Email:</AttributeTag>
              <div>{myUser.email}</div>
            </UserProfileAttribute> 
        </UserProfileAttributes>
      )}
      {!loading && editing && myUser && (
        <EditingProfileContainer>
          <UserProfileAttributes>
            <UserProfileAttribute>
              <AttributeTag>Name:</AttributeTag>
              <EditInput
                value={editingName}
                onChange={e => setEditingName(e.target.value)}
                />
            </UserProfileAttribute>
            {/* TODO: should we let users change their email? */}
            <UserProfileAttribute>
              <AttributeTag>Email:</AttributeTag>
              <div>{myUser.email}</div>
            </UserProfileAttribute> 
          </UserProfileAttributes>
          <ActionButtonsContainer>
            <CancelButton onClick={() => setEditing(false)}>
              Cancel
            </CancelButton>
            <SubmitButton onClick={() => handleNameChangeSubmit()}>
              Submit
            </SubmitButton>
          </ActionButtonsContainer>
        </EditingProfileContainer>
      )}
    </UserProfileContainer>
  );
};

export default ProfileMyProfilePage;