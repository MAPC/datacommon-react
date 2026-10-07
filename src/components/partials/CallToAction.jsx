import React from 'react';
import PropTypes from 'prop-types';

const CallToAction = ({
  link,
  text,
  extraClassNames = '',
  isDefaultLength = true,
  type,
  disabled = false,
  dataTooltip,
}) => {
  let contentClasses = 'call-to-action__content';
  let shadowClasses = 'call-to-action__shadow';
  if (isDefaultLength === false) {
    contentClasses = 'call-to-action__content call-to-action__content--long';
    shadowClasses = 'call-to-action__shadow call-to-action__shadow--long';
  }
  return (
    <div
      className={`call-to-action__wrapper ${extraClassNames}`}
      data-tooltip={dataTooltip || undefined}
    >
      {type === "submit" ? (
        <button type="submit" className={contentClasses} disabled={disabled}>
          {text}
        </button>
      ) : (
        <a href={link} className={contentClasses}>{text}</a>
      )}
      <div className={shadowClasses} />
    </div>
  );
};

CallToAction.propTypes = {
  link: PropTypes.string,
  text: PropTypes.string.isRequired,
  extraClassNames: PropTypes.string,
  isDefaultLength: PropTypes.bool,
  type: PropTypes.string,
  disabled: PropTypes.bool,
  dataTooltip: PropTypes.string,
};

export default CallToAction;
