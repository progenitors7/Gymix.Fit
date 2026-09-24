/**
 * razorpayService.js
 * Handles frontend Razorpay integration.
 */

export const razorpayService = {
  /**
   * Load the Razorpay Checkout script dynamically.
   */
  loadScript: () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  },

  /**
   * Open the Razorpay Checkout modal.
   * @param {Object} options - Razorpay options (order_id, key, amount, etc.)
   */
  openCheckout: (options) => {
    return new Promise((resolve, reject) => {
      const rzp = new window.Razorpay({
        ...options,
        handler: (response) => {
          resolve(response);
        },
        modal: {
          onDismiss: () => {
            reject(new Error('Payment cancelled by user'));
          }
        },
        theme: {
          color: '#059669'
        }
      });

      rzp.on('payment.failed', (response) => {
        reject(response.error);
      });

      rzp.open();
    });
  }
};
