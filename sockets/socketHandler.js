const Chatroom = require('../model/chatRoomSchema'); // Adjust path as needed
const Goods = require('../model/Goodmodel');
const socketAuth = require("../sockets/middleware/socketAuth");
const User = require('../model/Usermodel');
const {sendChatAlert}= require('../sendemail/sendChatAlert')

module.exports = (io) => {
  io.use(socketAuth); // Assumes socket.user is set here

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log("User connected:", user.firstname, user._id.toString());

    const updateUserStatus = async (isOnline) => {
      try {
        const updateFields = { online: isOnline };
    
        if (!isOnline) {
          updateFields.lastSeen = new Date();
        } else {
          updateFields.lastSeen = null;
        }
    
        const updatedUser = await User.findByIdAndUpdate(
          user._id,
          { $set: updateFields },
          { new: true }
        );
    
        console.log(`${updatedUser.firstname} is now ${isOnline ? 'online' : 'offline'}.`);
      } catch (err) {
        console.error('Error updating user status:', err);
      }
    };
    

    updateUserStatus(true);

    socket.on('send_message', async ({ roomId, content }) => {
      try {
        const senderId = user._id.toString();
        const senderName = user.firstname;
    
        if (!content) return socket.emit('error_message', 'Message content is required.');
        if (!roomId) return socket.emit('error_message', 'Room ID is required.');
    
       
        socket.join(roomId);
    
        let chatroom = await Chatroom.findOne({ roomId });
        if (!chatroom) return socket.emit('error_message', 'Chatroom not found.');
     
    
        const message = {
          senderId,
          senderName,
          content,
          timestamp: new Date(),
        };
    
        chatroom.messages.push(message);
        chatroom.lastMessage = content;
        chatroom.updatedAt = new Date();
    
        await chatroom.save();
    
        io.to(roomId).emit('receive_message', {
          roomId,
          ...message,
        });
    
    
        // --- Optional Notification ---
        const recipientId = senderId === chatroom.buyerId ? chatroom.sellerId : chatroom.buyerId;
        const recipient = await User.findById(recipientId);
        const chatLink = `${process.env.FRONTEND_USER}/chatroom/${chatroom.itemId || ''}/${roomId}`;
    
        if (recipient && !recipient.online) {
          await sendChatAlert({
            receiverEmail: recipient.email,
            receiverName: recipient.firstname,
            senderName,
            itemName: chatroom.itemTitle || "an item",
            chatLink,
          });
        }
    
      } catch (err) {
        console.error('Error in send_message:', err);
        socket.emit('error_message', 'Failed to send message.');
      }
    });
    
    

    socket.on('disconnect', async () => {
      console.log('User disconnected:', user.firstname, user._id.toString());
      updateUserStatus(false);
    });
  });
};
