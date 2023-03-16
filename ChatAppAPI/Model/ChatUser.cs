using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ChatAppAPI.Model
{
    public class ChatUser
    {
        [Key]
        public int Id { get; set; }

        public string UserId { get; set; }

        [ForeignKey("UserId")]
        public ApplicationUser User { get; set; }

        [ForeignKey("ChatId")]
        public int ChatId { get; set; }
        public Chat Chat { get; set; }
    }
}
