import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-in-out;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  animation: slideIn 0.3s ease-out;
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideIn {
    from { 
      opacity: 0;
      transform: translateY(-20px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #666;
  padding: 0;
  border-radius: 50%;
  transition: all 0.2s ease;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  
  &:hover {
    background-color: #f0f0f0;
    border-radius: 50%;
    transform: scale(1.05);
  }
`;

const Title = styled.h2`
  color: #333;
  margin-bottom: 1rem;
  font-size: 1.8rem;
  font-weight: 600;
`;

const Content = styled.div`
  line-height: 1.6;
  color: #555;
  
  p {
    margin-bottom: 1rem;
  }
  
  ul {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }
  
  li {
    margin-bottom: 0.5rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 0.2rem 0.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  
  &.primary {
    background-color: #6fc68e;
    color: white;
    
    &:hover {
      background-color: #5db37a;
    }
  }
  
  &.secondary {
    background-color: #f0f0f0;
    color: #666;
    
    &:hover {
      background-color: #e0e0e0;
    }
  }
`;

const IntroModal = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has explicitly chosen not to see the intro again
    const dontShowIntro = localStorage.getItem('dontShowIntro');
    // Check if user has seen the intro in this session
    const hasSeenIntroThisSession = sessionStorage.getItem('hasSeenIntro');
    
    if (!dontShowIntro && !hasSeenIntroThisSession) {
      // Show modal after a short delay to ensure page is loaded
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    // Mark that user has seen the intro in this session
    sessionStorage.setItem('hasSeenIntro', 'true');
  };

  const handleDontShowAgain = () => {
    setIsVisible(false);
    // Mark that user has seen the intro and doesn't want to see it again
    localStorage.setItem('hasSeenIntro', 'true');
    localStorage.setItem('dontShowIntro', 'true');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <ModalOverlay onClick={handleClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={handleClose}>&times;</CloseButton>
        
        <Title>Welcome to DataCommon</Title>
        
        <Content>
          <p>
            DataCommon is your gateway to comprehensive data about Massachusetts communities. 
            Explore demographic, economic, environmental, and social data across the state.
          </p>
          <p>On August 28, 2025 we launched a suite of new 
            features on the site. To read more about the 
            updates we made, check out our blog post:</p>
          
          <Button 
            className="primary" 
            onClick={() => window.open('https://www.mapc.org/planning101/datacommon-2025-improvements/', '_blank')}
            style={{ margin: '0.5rem 0 1rem 0', fontSize: '0.9rem' }}
          >
            Read About Our Latest Updates
          </Button>
          
          <p><strong>What you can do:</strong></p>
          <ul>
            <li><strong>Browse Datasets:</strong> Access hundreds of datasets covering various topics</li>
            <li><strong>Community Profiles:</strong> View detailed profiles for any Massachusetts municipality</li>
            <li><strong>Interactive Charts:</strong> Explore data through dynamic visualizations</li>
            <li><strong>Download Data:</strong> Export data in multiple formats (CSV, JSON, Shapefile)</li>
            <li><strong>Filter by Year:</strong> Select specific time periods to analyze trends</li>
          </ul>
          
          <p>
            <strong>Getting Started:</strong> Use the navigation menu to explore different sections, 
            or start by browsing datasets or viewing community profiles.
          </p>
        </Content>
        
        <ButtonGroup>
          <Button className="secondary" onClick={handleDontShowAgain}>
            Don't Show Again
          </Button>
          <Button className="primary" onClick={handleClose}>
            Get Started
          </Button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};

export default IntroModal;
