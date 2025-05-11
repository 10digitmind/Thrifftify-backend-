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

    socket.on('send_message', async ({ itemId, content, buyerName, buyerId }) => {
      try {
        const senderId = user._id.toString();
        const senderName = user.firstname;

        let roomId;
        let chatroom;
        let sellerId, sellerName, itemTitle, itemImageUrl;

        if (itemId) {
          const chatItem = await Goods.findById(itemId);
          if (!chatItem) return socket.emit('error_message', 'Item not found.');

          const sellerDetails = chatItem.sellerdetails?.[0];
          sellerId = sellerDetails?.sellerid;
          sellerName = sellerDetails?.firstname;
          itemImageUrl = chatItem.images?.[0];
          itemTitle = chatItem.title;

          if (!sellerId || !content) {
            return socket.emit('error_message', 'Missing required fields.');
          }

          roomId = `${itemId}_${buyerId}_${sellerId}`;
          socket.join(roomId);

          chatroom = await Chatroom.findOne({ roomId });

          if (!chatroom) {
            chatroom = new Chatroom({
              roomId,
              buyerId,
              buyerName,
              sellerId,
              sellerName,
              itemId,
              itemTitle,
              itemImageUrl,
              isItemChat: true,
              messages: [],
            });
          }
        } else {
          if (!buyerId || !content) {
            return socket.emit('error_message', 'Missing buyer or content.');
          }

          roomId = [buyerId, senderId].sort().join('_');
          socket.join(roomId);

          chatroom = await Chatroom.findOne({ roomId });

          if ((!buyerName || buyerId === senderId) && chatroom) {
            buyerId = chatroom.buyerId;
            buyerName = chatroom.buyerName;
          }

          if (!chatroom && buyerId !== senderId) {
            const receiverId = buyerId === senderId ? null : buyerId;
            const receiverName = buyerName;

            chatroom = new Chatroom({
              roomId,
              buyerId: senderId,
              buyerName: senderName,
              sellerId: receiverId,
              sellerName: receiverName,
              isItemChat: false,
              messages: [],
            });
          }
        }

        if (!chatroom) {
          return socket.emit('error_message', 'Could not create or find chatroom.');
        }

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
        let recipientId = (senderId === buyerId) ? sellerId : buyerId;
      

const recipient = await User.findById(recipientId);
const buyer =  await User.findById(buyerId);


if (recipient && !recipient.online) {
  await sendChatAlert({
    receiverEmail: recipient.email,
    receiverName: recipient.firstname,
    senderName: senderName,
    itemName: itemTitle || "an item",
    chatLink: `${process.env.FRONTEND_USER}/chatroom/${roomId}/${itemId}`,
  });
}else if(!buyer.online){
  await sendChatAlert({
    receiverEmail: buyer.email,
    receiverName: buyer.firstname,
    senderName: senderName,
    itemName: itemTitle || "an item",
    chatLink: `${process.env.FRONTEND_USER}/chatroom/${roomId}/${itemId}`,
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
